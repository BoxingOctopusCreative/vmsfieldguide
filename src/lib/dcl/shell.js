// The DCL shell: symbols, logical names, file-spec resolution, command dispatch and command procedures.
// It knows nothing about the page. Output goes through `io.write(text, kind)` and input comes from
// `io.readLine(prompt)`, which resolves to a string, or null for Ctrl-Z or an interrupt.

import { Disk, DEVICE, parseSpec, resolveDir, dirString, isWild } from './fs.js';
import { evaluate, DclError, str, int, toStr, toInt, truthy } from './expr.js';
import { stripComment, substitute, parseArgs, stringAssignValue, findKeyword, matchAbbrev } from './parse.js';
import { lexical } from './lexicals.js';
import { COMMANDS } from './commands.js';
import { vmsTime } from './time.js';
import { USER, NODE, VERSION, HOME, RMS, on } from './system.js';

export { USER, NODE, VERSION, HOME, RMS };

const MAX_DEPTH = 32;
const STEP_LIMIT = 50000;

/** Severity letter of a "%FAC-S-IDENT" message → the low three bits of a status. */
const SEV = { W: 0, S: 1, E: 2, I: 3, F: 4 };
export const sevOf = (status) => status & 7;

class Interrupt extends Error {}

export class Shell {
	/**
	 * @param {{ io: { write: (text: string, kind?: string) => void, readLine: (prompt: string) => Promise<string|null> }, disk?: any }} opts
	 */
	constructor({ io, disk }) {
		this.io = io;
		this.disk = new Disk(disk);
		this.reset();
	}

	/** Everything that a new login starts afresh. The disk is kept. */
	reset() {
		/** @type {Map<string, any>} */
		this.globals = new Map();
		/** Procedure frames; frame 0 is the interactive level. */
		this.frames = [this.newFrame(null)];
		/** Logical name tables, searched in this order: name → value. */
		this.lnm = {
			PROCESS: new Map([
				['SYS$COMMAND', `_${NODE}$FTA1:`],
				['SYS$DISK', `${DEVICE}:`],
				['SYS$ERROR', `_${NODE}$FTA1:`],
				['SYS$INPUT', `_${NODE}$FTA1:`],
				['SYS$OUTPUT', `_${NODE}$FTA1:`],
				['TT', 'FTA1:']
			]),
			JOB: new Map([
				['SYS$LOGIN', `${DEVICE}:[${HOME}]`],
				['SYS$LOGIN_DEVICE', `${DEVICE}:`],
				['SYS$SCRATCH', `${DEVICE}:[${HOME}]`]
			]),
			SYSTEM: new Map([
				['DISK$USER', 'DKA100:'],
				['SYS$NODE', `${NODE}::`]
			])
		};
		this.defaultDir = HOME;
		this.defaultProt = { S: 'RWED', O: 'RWED', G: 'RE', W: '' };
		this.prompt = '$ ';
		this.verify = false;
		this.status = 1;
		/** Most recent first. */
		this.history = [];
		this.searchContext = { spec: '', results: [], i: 0 };
		this.loggedOut = false;
		this.interrupted = false;
		this.prefill = null;
		this.loginTime = Date.now();
		this.steps = 0;
	}

	newFrame(proc) {
		return {
			proc,
			locals: new Map(),
			lines: proc?.lines ?? null,
			labels: proc?.labels ?? new Map(),
			pc: 0,
			gosub: [],
			on: { level: 2, action: 'EXIT' },
			exitStatus: undefined,
			jump: null
		};
	}

	get frame() {
		return this.frames[this.frames.length - 1];
	}

	get depth() {
		return this.frames.length - 1;
	}

	// ── Output ──────────────────────────────────────────────────────────

	out(text = '') {
		this.io.write(text, 'out');
	}

	/** Write a message (first line "%FAC-S-IDENT, ...") and return its status. */
	msg(text, status) {
		const m = text.match(/^%([A-Z$_]+)-([WSEIF])-([A-Z]+)/);
		const sev = m ? SEV[m[2]] : 0;
		const kind = ['w', 's', 'e', 'i', 'f'][sev];
		this.io.write(text, `msg-${kind}`);
		if (status !== undefined) return status;
		// A stable made-up code for the message, with the right severity in the low bits.
		let h = 0;
		for (const c of m ? m[1] + m[3] : text) h = (h * 31 + c.charCodeAt(0)) & 0xfff;
		return 0x10000000 + (0x1000 << 3) + (h << 3) + sev;
	}

	/** A note from the simulator itself, not something OpenVMS would say. */
	sim(text) {
		this.io.write(`%SIM-I-NOTSIM, ${text}`, 'sim');
		return 0x10000003;
	}

	// ── Symbols ─────────────────────────────────────────────────────────

	/** Look a symbol up: locals from the current level outwards, then globals. */
	lookup(name) {
		if (name === '$STATUS') return int(this.status);
		if (name === '$SEVERITY') return int(sevOf(this.status));
		for (let i = this.frames.length - 1; i >= 0; i--) {
			const v = this.frames[i].locals.get(name);
			if (v !== undefined) return v;
		}
		return this.globals.get(name);
	}

	/** A symbol's value as text, for apostrophe substitution. */
	symbolText(name) {
		const v = this.lookup(name);
		return v === undefined ? undefined : toStr(v);
	}

	setSymbol(name, value, global) {
		if (name === '$STATUS') {
			this.status = toInt(value);
			return;
		}
		if (global) this.globals.set(name, value);
		else this.frame.locals.set(name, value);
	}

	exprCtx() {
		return { lookup: (n) => this.lookup(n), lexical: (n, a) => lexical(this, n, a) };
	}

	eval(src) {
		return evaluate(src, this.exprCtx());
	}

	// ── Logical names and file specs ────────────────────────────────────

	/** A logical name's entry: { table, value }, from the first table that has it. */
	logical(name, tables = ['PROCESS', 'JOB', 'SYSTEM']) {
		const n = name.toUpperCase().replace(/:$/, '');
		for (const t of tables) if (this.lnm[t].has(n)) return { table: t, value: this.lnm[t].get(n) };
		return undefined;
	}

	/** The first translation of a logical name (the first element of a search list). */
	translate(name) {
		return this.logical(name)?.value.split(',')[0];
	}

	/**
	 * Resolve a file spec against logical names, the default directory and the command's defaults.
	 * @param {string} text
	 * @param {{ name?: string, type?: string, version?: string }} [defaults]
	 */
	resolve(text, defaults = {}) {
		let p = parseSpec(text);
		if (p.error) return { error: p.error, display: text.toUpperCase() };

		// A bare name may be a logical name: DEFINE X NOTES.TXT, then TYPE X.
		if (p.name && !p.device && p.dir === null && p.type === null && !p.version && this.translate(p.name) && !isWild(p.name)) {
			const q = parseSpec(this.translate(p.name));
			if (!q.error) p = q;
		}

		for (let n = 0; p.device && p.device !== DEVICE && p.device !== 'DKA100'; n++) {
			const t = this.translate(p.device);
			if (t === undefined || n > 10) return { error: 'DEV', display: text.toUpperCase() };
			const q = parseSpec(t);
			if (q.error) return { error: 'DEV', display: text.toUpperCase() };
			let dir = q.dir;
			if (p.dir !== null) dir = q.dir && p.dir.startsWith('.') ? q.dir + p.dir : p.dir;
			p = { device: q.device, dir, name: p.name ?? q.name, type: p.type ?? q.type, version: p.version ?? q.version };
		}

		const r = resolveDir(p.dir, this.defaultDir);
		if (r.error) return { error: 'DIR', display: text.toUpperCase() };
		const name = p.name ?? defaults.name ?? '';
		const type = p.type ?? defaults.type ?? '';
		const version = p.version ?? (defaults.version === '*' ? { kind: 'wild' } : null);
		const dirs = this.disk.matchDirs(r);
		const dirText = r.segs ? dirString(r.segs.join('.')) : `[${p.dir}]`;
		const verText = !version ? ';' : version.kind === 'wild' ? ';*' : version.kind === 'num' ? `;${version.n}` : version.kind === 'rel' ? `;-${version.n}` : ';';
		return {
			dirs,
			dirKey: r.segs ? r.segs.join('.') : null,
			wildDir: !r.segs,
			name,
			type,
			version,
			hasName: p.name !== null || p.type !== null,
			given: { name: p.name !== null, type: p.type !== null },
			wild: !r.segs || isWild(name) || isWild(type) || version?.kind === 'wild',
			display: `${DEVICE}:${dirText}${name}.${type}${verText}`
		};
	}

	/** Matching files for a resolved spec, using `latest` when no version was given. */
	find(res) {
		return this.disk.search(res.dirs, res.name || '*', res.type || '', res.version ?? { kind: 'latest' });
	}

	// ── Running commands ────────────────────────────────────────────────

	/** Log in: greet the user and run SYS$LOGIN:LOGIN.COM if there is one. */
	async login() {
		this.reset();
		const res = this.resolve('SYS$LOGIN:LOGIN.COM');
		if (this.find(res).length) await this.runSafely('@SYS$LOGIN:LOGIN.COM');
	}

	/** Run one line typed at the $ prompt. */
	async command(line) {
		const text = line.replace(/\s+$/, '');
		if (text.trim()) {
			if (this.history[0] !== text) this.history.unshift(text);
			if (this.history.length > 254) this.history.length = 254;
		}
		await this.runSafely(text);
	}

	async runSafely(text) {
		this.interrupted = false;
		this.steps = 0;
		try {
			await this.exec(text);
		} catch (e) {
			if (e instanceof Interrupt) {
				this.frames.length = 1;
			} else if (e instanceof DclError) {
				this.status = this.msg(e.message, e.status);
			} else {
				this.frames.length = 1;
				this.status = this.msg(`%SIM-F-BUG, the simulator hit an internal error: ${e?.message ?? e}`);
				console.error(e);
			}
		}
	}

	/** Stop whatever is running at the next chance (Ctrl-Y). */
	interrupt() {
		this.interrupted = true;
	}

	checkInterrupt() {
		if (this.interrupted) throw new Interrupt();
	}

	/**
	 * Execute one command line at the current level.
	 * @param {string} raw
	 */
	async exec(raw) {
		let text = stripComment(raw).trim().replace(/^\$\s*/, '');
		if (!text) return 1;
		text = substitute(text, (n) => this.symbolText(n));
		text = text.trim();
		if (!text) return 1;

		// Symbol assignment: X = 1, X == "a", X := abc, X :== abc
		const asg = text.match(/^([A-Z$_][A-Z0-9$_]*)\s*(==|=|:==|:=)(?!=)\s*(.*)$/i);
		if (asg) {
			const name = asg[1].toUpperCase();
			const op = asg[2];
			const value = op.startsWith(':') ? str(stringAssignValue(asg[3])) : this.eval(asg[3]);
			this.setSymbol(name, value, op.endsWith('=='));
			return this.setStatus(1);
		}

		let m = text.match(/^(@|[A-Z0-9$_]+)/i);
		if (!m) return this.setStatus(this.msg(`%DCL-W-IVVERB, unrecognized command verb - check validity and spelling\n \\${text.split(/\s/)[0].toUpperCase()}\\`, 0x00038090));

		// A symbol used as a command: DIR :== DIRECTORY/SIZE, then DIR. Substituted once,
		// so EDIT :== EDIT/TPU works as it does on a real system.
		const sym = m[1] === '@' ? undefined : this.lookup(m[1].toUpperCase());
		if (sym && sym.t === 's' && sym.v.trim()) {
			text = sym.v + text.slice(m[1].length);
			m = text.match(/^(@|[A-Z0-9$_]+)/i);
		}
		if (!m) return this.setStatus(this.msg(`%DCL-W-IVVERB, unrecognized command verb - check validity and spelling\n \\${text.toUpperCase()}\\`, 0x00038090));

		const verbTok = m[1].toUpperCase();
		const rest = text.slice(m[1].length);
		const { match, ambiguous } = verbTok === '@' ? { match: COMMANDS.find((c) => c.name === '@') } : matchAbbrev(verbTok, COMMANDS);
		if (ambiguous) return this.setStatus(this.msg(`%DCL-W-ABVERB, ambiguous command verb - supply more characters\n \\${verbTok}\\`, 0x00038088));
		if (!match) return this.setStatus(this.msg(`%DCL-W-IVVERB, unrecognized command verb - check validity and spelling\n \\${verbTok}\\`, 0x00038090));

		if (match.notSim) return this.setStatus(this.sim(`${match.name} exists on OpenVMS, but isn't part of this simulator. ${match.notSim}`));

		const cmd = { verb: match.name, raw: rest, params: [], quoted: [], quals: new Map() };
		if (!match.raw) {
			const parsed = parseArgs(rest);
			const err = this.resolveQuals(match, parsed.quals, cmd.quals);
			if (err) return this.setStatus(err);
			cmd.params = parsed.params;
			cmd.quoted = parsed.quoted;
			const max = match.max ?? 8;
			if (cmd.params.length > max) {
				return this.setStatus(this.msg(`%DCL-W-MAXPARM, too many parameters - reenter command with fewer parameters\n \\${cmd.params[max].join(',')}\\`, 0x00038098));
			}
			// Missing required parameters: prompt for them at the terminal, as DCL does.
			const prompts = match.prompts ?? [];
			while (cmd.params.length < (match.minParams ?? 0)) {
				if (this.depth > 0) return this.setStatus(this.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters', 0x00038048));
				const answer = await this.io.readLine(prompts[cmd.params.length] ?? '_Parameter: ');
				this.checkInterrupt();
				if (answer === null) return this.setStatus(1);
				const more = parseArgs(answer);
				const qerr = this.resolveQuals(match, more.quals, cmd.quals);
				if (qerr) return this.setStatus(qerr);
				if (!more.params.length) continue;
				cmd.params.push(...more.params);
				cmd.quoted.push(...more.quoted);
			}
		}

		const status = await match.run(this, cmd);
		return this.setStatus(status ?? 1);
	}

	setStatus(s) {
		this.status = s;
		return s;
	}

	/** Match typed qualifiers against a command's list. Returns an error status, or 0. */
	resolveQuals(def, typed, into) {
		const list = (def.quals ?? []).map((q) => ({ name: q }));
		for (const q of typed) {
			let neg = false;
			let { match } = matchAbbrev(q.name, list);
			if (!match && q.name.startsWith('NO')) {
				match = matchAbbrev(q.name.slice(2), list).match;
				neg = !!match;
			}
			if (!match || !q.name) {
				return this.msg(`%CLI-W-IVQUAL, unrecognized qualifier - check validity, spelling, and placement\n \\${q.name}\\`, 0x000380a8);
			}
			into.set(match.name, { value: q.value, neg, quoted: q.quoted });
		}
		return 0;
	}

	static on = on;

	// ── Command procedures ──────────────────────────────────────────────

	/** Load a .COM file's text into lines and labels, joining "-" continuation lines. */
	static loadProcedure(text) {
		const src = text.split('\n');
		const lines = [];
		for (let i = 0; i < src.length; i++) {
			let line = src[i].replace(/\s+$/, '');
			while (/-$/.test(stripComment(line).trimEnd()) && line.startsWith('$') && i + 1 < src.length) {
				line = stripComment(line).trimEnd().slice(0, -1) + src[++i].replace(/^\s*\$?/, '').replace(/\s+$/, '');
			}
			lines.push(line);
		}
		const labels = new Map();
		lines.forEach((l, i) => {
			const m = l.match(/^\$\s*([A-Z0-9$_]+)\s*:(?![=])/i);
			if (m) labels.set(m[1].toUpperCase(), i);
		});
		return { lines, labels };
	}

	/**
	 * Run a command procedure with parameters P1–P8.
	 * @param {string} file  the full file name, for F$ENVIRONMENT("PROCEDURE")
	 * @param {string} text @param {string[]} params
	 */
	async runProcedure(file, text, params) {
		if (this.depth >= MAX_DEPTH) return this.msg('%DCL-F-STKOVF, command procedures too deeply nested - limit to 32 levels');
		const proc = { file, ...Shell.loadProcedure(text) };
		const frame = this.newFrame(proc);
		for (let i = 1; i <= 8; i++) frame.locals.set(`P${i}`, str(params[i - 1] ?? ''));
		this.frames.push(frame);
		try {
			let status = 1;
			while (frame.pc < frame.lines.length) {
				this.checkInterrupt();
				if (++this.steps > STEP_LIMIT) {
					this.msg('%SIM-W-RUNAWAY, stopped after 50,000 commands; is there a loop with no way out?');
					throw new Interrupt();
				}
				if (this.steps % 250 === 0) await new Promise((r) => setTimeout(r, 0));

				const line = frame.lines[frame.pc++];
				if (!line.trim()) continue;
				if (!line.startsWith('$')) {
					this.msg('%DCL-W-SKPDAT, image data (records not beginning with "$") ignored');
					continue;
				}
				if (this.verify) this.io.write(line, 'verify');
				const body = line.slice(1).replace(/^\s*[A-Z0-9$_]+\s*:(?![=])/i, '');

				try {
					status = await this.execInProcedure(body, frame);
				} catch (e) {
					if (!(e instanceof DclError)) throw e;
					status = this.setStatus(this.msg(e.message, e.status));
				}
				if (frame.exitStatus !== undefined) return frame.exitStatus;
				if (frame.jump) {
					const target = frame.labels.get(frame.jump);
					const label = frame.jump;
					frame.jump = null;
					if (target === undefined) {
						return this.msg(`%DCL-W-USGOTO, target of GOTO not found - check spelling and presence of label\n \\${label}\\`);
					}
					frame.pc = target;
					continue;
				}

				// ON WARNING / ERROR / SEVERE_ERROR: what to do when a command fails.
				const sev = sevOf(status);
				const level = sev === 0 || sev === 2 || sev === 4 ? sev : -1;
				if (level >= 0 && level >= frame.on.level) {
					const action = frame.on.action;
					frame.on = { level: 2, action: 'EXIT' };
					if (action === 'EXIT') return status;
					if (action.startsWith('GOTO ')) {
						const target = frame.labels.get(action.slice(5));
						if (target === undefined) return status;
						frame.pc = target;
					}
				}
			}
			return status;
		} finally {
			this.frames.pop();
		}
	}

	/** One procedure line, with block IF / THEN / ELSE / ENDIF handled here. */
	async execInProcedure(body, frame) {
		const t = stripComment(body).trim();
		const word = (t.match(/^[A-Z]+/i)?.[0] ?? '').toUpperCase();
		if (word === 'ENDIF') return 1;
		if (word === 'THEN' && t.length === 4) return 1;
		if (word === 'ELSE') {
			// Reached the end of a THEN branch: skip to the matching ENDIF.
			frame.pc = this.skipBlock(frame, frame.pc, false).pc;
			return 1;
		}
		if (word === 'IF' && findKeyword(t, 'THEN') < 0) return this.blockIf(t.slice(2), frame);
		return this.exec(body);
	}

	/** A block IF: the condition is on this line, THEN on the next. */
	async blockIf(cond, frame) {
		const next = frame.lines[frame.pc] ?? '';
		const m = next.match(/^\$\s*THEN\b(.*)$/i);
		if (!m) return this.msg('%DCL-W-NOTHEN, IF without a THEN - put THEN on the line after the condition');
		frame.pc++;
		if (truthy(this.eval(substitute(cond, (n) => this.symbolText(n))))) {
			return m[1].trim() ? this.exec(m[1]) : 1;
		}
		const { pc, elseRest } = this.skipBlock(frame, frame.pc, true);
		frame.pc = pc;
		return elseRest ? this.exec(elseRest) : 1;
	}

	/**
	 * Skip forward to the matching ELSE (if stopAtElse) or ENDIF, honouring nested block IFs.
	 * Returns the line after it, and any command written after ELSE on the same line.
	 */
	skipBlock(frame, from, stopAtElse) {
		let depth = 0;
		for (let i = from; i < frame.lines.length; i++) {
			const t = stripComment(frame.lines[i].replace(/^\$\s*([A-Z0-9$_]+\s*:(?![=]))?/i, '')).trim();
			const w = (t.match(/^[A-Z]+/i)?.[0] ?? '').toUpperCase();
			if (w === 'IF' && findKeyword(t, 'THEN') < 0) depth++;
			else if (w === 'ENDIF') {
				if (depth === 0) return { pc: i + 1 };
				depth--;
			} else if (w === 'ELSE' && depth === 0 && stopAtElse) return { pc: i + 1, elseRest: t.slice(4).trim() };
		}
		return { pc: frame.lines.length };
	}

	/**
	 * Read a line of data: in a procedure, the next line that doesn't start with "$";
	 * at the terminal, a line typed by the user. Null means end of data (Ctrl-Z, or a "$" line).
	 */
	async readData(prompt = '') {
		const f = this.frame;
		if (f.lines) {
			const line = f.lines[f.pc];
			if (line === undefined || line.startsWith('$')) return null;
			f.pc++;
			return line;
		}
		const line = await this.io.readLine(prompt);
		this.checkInterrupt();
		return line;
	}

	/** Pause for a while, waking early on Ctrl-Y. */
	async sleep(ms) {
		const end = Date.now() + ms;
		while (Date.now() < end) {
			this.checkInterrupt();
			await new Promise((r) => setTimeout(r, Math.min(100, end - Date.now())));
		}
	}

	now() {
		return vmsTime();
	}
}

export { Interrupt };
