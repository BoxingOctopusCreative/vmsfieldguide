// EDT in line mode: the classic OpenVMS editor, driven by commands at a "*" prompt.
// Keypad (CHANGE) mode isn't simulated; EVE (EDIT/TPU) is the full-screen editor here.

import { matchAbbrev } from './parse.js';
import { fullName } from './fs.js';

const VERBS = [
	{ name: 'TYPE', min: 1 },
	{ name: 'INSERT', min: 1 },
	{ name: 'DELETE', min: 1 },
	{ name: 'REPLACE', min: 1 },
	{ name: 'SUBSTITUTE', min: 1 },
	{ name: 'FIND', min: 1 },
	{ name: 'MOVE', min: 1 },
	{ name: 'COPY', min: 2 },
	{ name: 'EXIT', min: 2 },
	{ name: 'QUIT', min: 3 },
	{ name: 'CHANGE', min: 1 },
	{ name: 'HELP', min: 1 },
	{ name: 'RESEQUENCE', min: 3 },
	{ name: 'WRITE', min: 2 }
];

const HELP_TEXT = `EDT line-mode commands this simulator knows (abbreviations in capitals):

  T range               TYPE: show lines, e.g. T WHOLE, T 2:5, T 'text'
  I [range]             INSERT: type lines before the range; Ctrl-Z to finish
  D range               DELETE lines
  R range               REPLACE: delete lines, then insert new ones
  S/old/new/ [range]    SUBSTITUTE text in lines (default: the current line)
  F range               FIND: move to a line without showing it
  M range TO range      MOVE lines;  CO range TO range  COPY lines
  EX                    EXIT: save as a new version and leave
  QUI                   QUIT: leave without saving
  Return                show the next line;  a line number moves there

Ranges: n, n:m, n THRU m, ., BEGIN, END, REST, WHOLE, 'text'.
Keypad mode (CHANGE) isn't simulated; use EDIT/TPU for full-screen editing.`;

/**
 * Run EDT on a file.
 * @param {import('./shell.js').Shell} sh
 * @param {{ dir: string, name: string, type: string, rec: any, display: string, readOnly: boolean }} f
 */
export async function runEdt(sh, f) {
	let lines = f.rec?.text ? f.rec.text.split('\n') : [];
	let cur = 0;
	let changed = false;
	const out = (t) => sh.out(t);
	const show = (i) => out(i >= lines.length ? '[EOB]' : `${String(i + 1).padStart(5)}        ${lines[i]}`);

	if (!f.rec) out('Input file does not exist');
	show(cur);

	/** Find the line holding `text`, searching forward from the current line, then from the top. */
	const findLine = (text) => {
		const t = text.toUpperCase();
		for (let i = cur; i < lines.length; i++) if (lines[i].toUpperCase().includes(t)) return i;
		return -1;
	};

	/** One end of a range: a line index, lines.length for [EOB], or a string error. */
	const point = (tok) => {
		const t = tok.trim();
		const u = t.toUpperCase();
		if (u === '' || u === '.') return cur;
		if (/^B(EGIN)?$/.test(u)) return 0;
		if (/^E(ND)?$/.test(u)) return lines.length;
		if (/^\d+$/.test(u)) {
			const n = Number(u) - 1;
			return n < 0 ? 0 : Math.min(n, lines.length);
		}
		const q = t.match(/^(['"])(.*)\1?$/);
		if (q) {
			const i = findLine(q[2].replace(/['"]$/, ''));
			return i < 0 ? 'String was not found' : i;
		}
		return `Unrecognized range: ${t}`;
	};

	/** A range as [start, end] indices (inclusive), or a string error. */
	const range = (text, { allowEob = false } = {}) => {
		const t = text.trim();
		const u = t.toUpperCase();
		if (/^W(HOLE)?$/.test(u)) return lines.length ? [0, lines.length - 1] : 'No lines in the buffer';
		if (/^REST$/.test(u)) return cur < lines.length ? [cur, lines.length - 1] : 'No lines in the range';
		const parts = t.split(/\s*:\s*|\s+THRU\s+/i);
		const a = point(parts[0]);
		const b = parts.length > 1 ? point(parts[1]) : a;
		if (typeof a === 'string') return a;
		if (typeof b === 'string') return b;
		if (!allowEob && a >= lines.length) return 'No lines in the range';
		return [Math.min(a, b), Math.min(Math.max(a, b), Math.max(lines.length - 1, 0))];
	};

	const readLines = async () => {
		const got = [];
		for (;;) {
			const l = await sh.io.readLine('');
			sh.checkInterrupt();
			if (l === null) return got;
			got.push(l);
		}
	};

	for (;;) {
		const raw = await sh.io.readLine('*');
		sh.checkInterrupt();
		if (raw === null) continue;
		const cmd = raw.trim();

		// Return on its own: the next line.
		if (!cmd) {
			if (cur < lines.length) cur++;
			show(cur);
			continue;
		}

		// A range on its own moves there and shows the line.
		if (/^(\d|['".])/.test(cmd) || /^(BEGIN|END|B|E)$/i.test(cmd)) {
			const r = range(cmd, { allowEob: true });
			if (typeof r === 'string') {
				out(r);
				continue;
			}
			cur = r[0] >= lines.length ? lines.length : r[0];
			show(cur);
			continue;
		}

		// SUBSTITUTE takes its delimiter straight after the verb: S/old/new/
		const sub = cmd.match(/^S(?:U(?:B(?:S(?:T(?:I(?:T(?:U(?:T(?:E)?)?)?)?)?)?)?)?)?\s*([^\sA-Z0-9])(.*?)\1(.*?)\1(.*)$/i);
		if (sub) {
			if (f.readOnly) {
				out('File is read-only');
				continue;
			}
			const r = range(sub[4] || '.');
			if (typeof r === 'string') {
				out(r);
				continue;
			}
			let n = 0;
			const re = new RegExp(sub[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
			for (let i = r[0]; i <= r[1]; i++) {
				if (!sub[2] || !re.test(lines[i])) continue;
				re.lastIndex = 0;
				lines[i] = lines[i].replace(re, sub[3]);
				show(i);
				cur = i;
				n++;
			}
			if (!n) out('String was not found');
			else if (r[1] > r[0]) out(`${n} substitution${n === 1 ? '' : 's'}`);
			changed ||= n > 0;
			continue;
		}

		const m = cmd.match(/^([A-Z]+)\s*(.*)$/i);
		const { match, ambiguous } = m ? matchAbbrev(m[1].toUpperCase(), VERBS) : {};
		if (!match) {
			out(ambiguous ? 'Ambiguous command' : 'Unrecognized command');
			continue;
		}
		const arg = m[2];
		const editing = ['INSERT', 'DELETE', 'REPLACE', 'MOVE', 'COPY'].includes(match.name);
		if (editing && f.readOnly) {
			out('File is read-only');
			continue;
		}

		switch (match.name) {
			case 'TYPE': {
				const r = range(arg || '.', { allowEob: true });
				if (typeof r === 'string') {
					out(r);
					break;
				}
				if (r[0] >= lines.length) {
					cur = lines.length;
					show(cur);
					break;
				}
				for (let i = r[0]; i <= r[1]; i++) show(i);
				cur = r[1];
				break;
			}
			case 'FIND': {
				const r = range(arg || '.', { allowEob: true });
				if (typeof r === 'string') out(r);
				else cur = Math.min(r[0], lines.length);
				break;
			}
			case 'INSERT': {
				const at = arg ? point(arg) : cur;
				if (typeof at === 'string') {
					out(at);
					break;
				}
				const add = await readLines();
				lines.splice(at, 0, ...add);
				cur = at + add.length;
				changed ||= add.length > 0;
				break;
			}
			case 'DELETE':
			case 'REPLACE': {
				const r = range(arg || '.');
				if (typeof r === 'string') {
					out(r);
					break;
				}
				const n = r[1] - r[0] + 1;
				lines.splice(r[0], n);
				out(`${n} line${n === 1 ? '' : 's'} deleted`);
				cur = r[0];
				changed = true;
				if (match.name === 'REPLACE') {
					const add = await readLines();
					lines.splice(r[0], 0, ...add);
					cur = r[0] + add.length;
				} else show(cur);
				break;
			}
			case 'MOVE':
			case 'COPY': {
				const [from, to] = arg.split(/\s+TO\s+/i);
				if (to === undefined) {
					out('TO expected');
					break;
				}
				const r = range(from || '.');
				const dest = point(to);
				if (typeof r === 'string' || typeof dest === 'string') {
					out(typeof r === 'string' ? r : dest);
					break;
				}
				const block = lines.slice(r[0], r[1] + 1);
				let at = dest;
				if (match.name === 'MOVE') {
					if (dest > r[0] && dest <= r[1]) {
						out('Destination is inside the range');
						break;
					}
					lines.splice(r[0], block.length);
					if (dest > r[1]) at -= block.length;
				}
				lines.splice(at, 0, ...block);
				out(`${block.length} line${block.length === 1 ? '' : 's'} ${match.name === 'MOVE' ? 'moved' : 'copied'}`);
				cur = at;
				changed = true;
				break;
			}
			case 'EXIT': {
				if (f.readOnly) {
					out('File is read-only; use QUIT');
					break;
				}
				const v = sh.disk.write(f.dir, f.name, f.type, lines.join('\n'), { prot: f.rec?.prot ?? sh.defaultProt });
				out(`${fullName(f.dir, f.name, f.type, v)} ${lines.length} line${lines.length === 1 ? '' : 's'}`);
				return 1;
			}
			case 'QUIT':
				return 1;
			case 'CHANGE':
				sh.sim("EDT's keypad (CHANGE) mode isn't part of this simulator. For a full-screen editor, QUIT and use EDIT/TPU.");
				break;
			case 'HELP':
				for (const l of HELP_TEXT.split('\n')) out(l);
				break;
			case 'RESEQUENCE':
				out(`${lines.length} line${lines.length === 1 ? '' : 's'} resequenced`);
				break;
			case 'WRITE':
				sh.sim('WRITE isn\'t part of this simulator; EXIT saves the buffer.');
				break;
		}
		void changed;
	}
}
