// The DCL verbs the simulator knows. Each entry:
//   name, min (shortest abbreviation when others share the prefix), quals, min/max parameters,
//   prompts for missing parameters, raw (gets the unparsed rest of the line), and run(sh, cmd).
// Verbs with `notSim` are real OpenVMS commands the simulator doesn't model; they say so.

import { DEVICE, dirString, fullName, blocks, applyProt } from './fs.js';
import { RMS, USER, NODE, VERSION, on } from './system.js';
import { str, toStr, toInt, truthy } from './expr.js';
import { stringAssignValue, findKeyword, splitTop, matchAbbrev, parseArgs } from './parse.js';
import { vmsTime, parseVmsTime, parseDelta } from './time.js';
import { protWords } from './lexicals.js';
import { HELP } from './help.js';
import { runEdt } from './edt.js';

const qval = (c, name) => c.quals.get(name)?.value ?? null;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const used = (e) => (e.isDir ? 1 : blocks(e.rec.text));
const alloc = (b) => (b ? Math.ceil(b / 16) * 16 : 0);
const entryName = (e) => fullName(e.dir, e.name, e.type, e.v);

/** Why a resolved spec found nothing: the RMS code to show under the command's own message. */
function why(sh, res) {
	if (res.error) return RMS[res.error];
	if (!res.wildDir && !sh.disk.hasDir(res.dirKey)) return RMS.DNF;
	return RMS.FNF;
}

/** The text a command wrote, if /OUTPUT sends it to a file instead of the screen. */
async function withOutput(sh, c, fn) {
	const spec = qval(c, 'OUTPUT');
	if (!c.quals.has('OUTPUT') || c.quals.get('OUTPUT').neg) return fn();
	const res = sh.resolve(spec ?? '', { name: c.verb === 'DIRECTORY' ? 'DIRECTORY' : c.verb === 'SEARCH' ? 'SEARCH' : c.verb === 'DIFFERENCES' ? 'DIFFERENCES' : 'TYPE', type: 'LIS' });
	if (res.error || res.wildDir || res.wild || !sh.disk.hasDir(res.dirKey)) {
		return sh.msg(`%${facility(c.verb)}-E-OPENOUT, error opening ${res.display} as output\n${res.wild ? RMS.WLD : why(sh, res)}`);
	}
	const lines = [];
	const write = sh.io.write;
	sh.io = { ...sh.io, write: (t, kind) => (kind === 'out' ? lines.push(t) : write(t, kind)) };
	try {
		return await fn();
	} finally {
		sh.io = { ...sh.io, write };
		sh.disk.write(res.dirKey, res.name, res.type, lines.join('\n'), { prot: sh.defaultProt });
	}
}

const facility = (verb) => ({ DIRECTORY: 'DIRECT', DIFFERENCES: 'DIFF' })[verb] ?? verb;

// ── DIRECTORY ───────────────────────────────────────────────────────────

async function directory(sh, c) {
	const specs = c.params[0] ?? ['*.*;*'];
	const full = on(c, 'FULL');
	const sizeQ = on(c, 'SIZE') || full;
	const sizeAll = full || ['ALL', 'ALLOCATION'].includes(qval(c, 'SIZE') ?? '');
	const dateQ = on(c, 'DATE');
	const modified = qval(c, 'DATE') === 'MODIFIED';
	const owner = on(c, 'OWNER');
	const prot = on(c, 'PROTECTION');
	const totalOnly = on(c, 'TOTAL');
	const info = !on(c, 'BRIEF') && (sizeQ || dateQ || owner || prot);
	const cols = Math.max(1, Math.min(8, Number(qval(c, 'COLUMNS')) || (info ? 1 : 4)));
	const keep = Number(qval(c, 'VERSIONS')) || Infinity;
	const heading = !c.quals.get('HEADING')?.neg;
	const trailing = !c.quals.get('TRAILING')?.neg;
	let since = null;
	let before = null;
	for (const [q, set] of [['SINCE', (v) => (since = v)], ['BEFORE', (v) => (before = v)]]) {
		if (!c.quals.has(q)) continue;
		const t = parseVmsTime(qval(c, q) ?? 'TODAY');
		if (t === null) return sh.msg(`%CLI-W-IVATIME, invalid absolute time - use DD-MMM-YYYY:HH:MM:SS.CC format\n \\${qval(c, q)}\\`);
		set(t);
	}

	/** @type {Map<string, any[]>} */
	const byDir = new Map();
	let status = 1;
	let failed = false;
	for (const spec of specs) {
		const res = sh.resolve(spec, { name: '*', type: '*', version: '*' });
		if (res.error || !res.dirs.length) {
			status = sh.msg(`%DIRECT-E-OPENIN, error opening ${res.display} as input\n${why(sh, res)}`);
			failed = true;
			continue;
		}
		let found = sh.disk.search(res.dirs, res.name || '*', res.type || '*', res.version);
		const seen = new Map();
		found = found.filter((e) => {
			const k = `${e.dir}|${e.name}.${e.type}`;
			seen.set(k, (seen.get(k) ?? 0) + 1);
			const t = e.rec.created;
			return seen.get(k) <= keep && (since === null || t >= since) && (before === null || t < before);
		});
		for (const e of found) {
			if (!byDir.has(e.dir)) byDir.set(e.dir, []);
			const list = byDir.get(e.dir);
			if (!list.some((x) => x.name === e.name && x.type === e.type && x.v === e.v)) list.push(e);
		}
	}
	if (!byDir.size) return failed ? status : sh.msg('%DIRECT-W-NOFILES, no files found');

	let grandFiles = 0;
	let grandUsed = 0;
	let grandAlloc = 0;
	for (const dir of [...byDir.keys()].sort()) {
		const list = byDir.get(dir);
		if (heading) {
			sh.out('');
			sh.out(`Directory ${DEVICE}:${dirString(dir)}`);
			sh.out('');
		}
		if (!totalOnly) {
			if (full) for (const e of list) fullListing(sh, e);
			else if (info) {
				for (const e of list) {
					const nm = `${e.name}.${e.type};${e.v}`;
					let line = nm.length > 18 ? `${nm}\n${' '.repeat(19)}` : nm.padEnd(19);
					const b = used(e);
					if (sizeQ) line += (sizeAll ? `${b}/${alloc(b)}` : String(b)).padStart(sizeAll ? 11 : 7);
					if (dateQ) line += `  ${vmsTime(modified ? e.rec.modified : e.rec.created)}`;
					if (owner) line += `  [${USER}]`.padEnd(20);
					if (prot) line += `  ${dirProt(e.rec.prot)}`;
					sh.out(line.replace(/\s+$/, ''));
				}
			} else {
				let row = [];
				const flush = () => {
					if (row.length) sh.out(row.join('').replace(/\s+$/, ''));
					row = [];
				};
				for (const e of list) {
					const nm = `${e.name}.${e.type};${e.v}`;
					if (nm.length > 18 && cols > 1) {
						flush();
						sh.out(nm);
						continue;
					}
					row.push(nm.padEnd(20));
					if (row.length === cols) flush();
				}
				flush();
			}
		}
		const u = list.reduce((s, e) => s + used(e), 0);
		const a = list.reduce((s, e) => s + alloc(used(e)), 0);
		grandFiles += list.length;
		grandUsed += u;
		grandAlloc += a;
		if (trailing) {
			sh.out('');
			sh.out(`Total of ${plural(list.length, 'file')}${sizeQ || totalOnly ? `, ${sizeAll ? `${u}/${a} blocks` : plural(u, 'block')}` : ''}.`);
		}
	}
	if (byDir.size > 1 && trailing) {
		sh.out('');
		sh.out(`Grand total of ${byDir.size} directories, ${plural(grandFiles, 'file')}${sizeQ || totalOnly ? `, ${sizeAll ? `${grandUsed}/${grandAlloc} blocks` : plural(grandUsed, 'block')}` : ''}.`);
	}
	return status;
}

/** "(RWED,RWED,RE,)", as DIRECTORY/PROTECTION shows it. */
const dirProt = (p) => `(${p.S},${p.O},${p.G},${p.W})`;

function fullListing(sh, e) {
	const b = used(e);
	const longest = Math.max(0, ...e.rec.text.split('\n').map((l) => l.length));
	const nm = `${e.name}.${e.type};${e.v}`;
	sh.out(`${nm.padEnd(30)}File ID:  (${1000 + e.v + e.name.length * 7},1,0)`);
	sh.out(`Size:${`${b}/${alloc(b)}`.padStart(13)}         Owner:    [${USER}]`);
	sh.out(`Created:    ${vmsTime(e.rec.created)}`);
	sh.out(`Revised:    ${vmsTime(e.rec.modified)} (1)`);
	sh.out(`Expires:    <None specified>`);
	sh.out(`Backup:     <No backup recorded>`);
	sh.out(`File organization:  Sequential`);
	if (e.isDir) sh.out(`File attributes:    Directory file`);
	sh.out(`Record format:      Variable length, maximum 0 bytes, longest ${longest} bytes`);
	sh.out(`Record attributes:  Carriage return carriage control`);
	sh.out(`File protection:    System:${e.rec.prot.S}, Owner:${e.rec.prot.O}, Group:${e.rec.prot.G}, World:${e.rec.prot.W}`);
	sh.out(`Access Cntrl List:  None`);
	sh.out('');
}

// ── Reading files ───────────────────────────────────────────────────────

async function type(sh, c) {
	let status = 1;
	for (const spec of c.params[0]) {
		const res = sh.resolve(spec, { type: 'LIS' });
		const found = res.error ? [] : sh.find(res);
		if (!found.length) {
			status = sh.msg(`%TYPE-W-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
			continue;
		}
		for (const e of found) {
			sh.checkInterrupt();
			if (res.wild || c.params[0].length > 1) {
				sh.out('');
				sh.out(entryName(e));
				sh.out('');
			}
			if (e.isDir) {
				status = sh.msg(`%TYPE-W-READERR, error reading ${entryName(e)}\n-RMS-F-RER, file read error`);
				continue;
			}
			if (!e.rec.prot.O.includes('R')) {
				status = sh.msg(`%TYPE-W-OPENIN, error opening ${entryName(e)} as input\n${RMS.PRV}`);
				continue;
			}
			if (e.rec.text) sh.out(e.rec.text);
		}
	}
	return status;
}

async function search(sh, c) {
	const exact = on(c, 'EXACT');
	const numbers = on(c, 'NUMBERS');
	const mode = matchAbbrev(qval(c, 'MATCH') ?? 'OR', ['AND', 'OR', 'NAND', 'NOR'].map((n) => ({ name: n }))).match?.name ?? 'OR';
	const strings = c.params[1].map((s) => (exact ? s : s.toUpperCase()));
	// Unquoted search strings were upper-cased by the parser; quoted ones keep their case (and /EXACT honours it).
	const files = [];
	let status = 1;
	for (const spec of c.params[0]) {
		const res = sh.resolve(spec);
		const found = res.error ? [] : sh.find(res).filter((e) => !e.isDir);
		if (!found.length) status = sh.msg(`%SEARCH-W-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
		files.push(...found.map((e) => ({ e, wild: res.wild })));
	}
	const headings = files.length > 1;
	let any = false;
	for (const { e } of files) {
		const lines = e.rec.text ? e.rec.text.split('\n') : [];
		const hits = [];
		lines.forEach((line, i) => {
			const hay = exact ? line : line.toUpperCase();
			const n = strings.filter((s) => hay.includes(s)).length;
			const ok = { OR: n > 0, AND: n === strings.length, NOR: n === 0, NAND: n < strings.length }[mode];
			if (ok) hits.push(numbers ? `${String(i + 1).padStart(5)}  ${line}` : line);
		});
		if (!hits.length) continue;
		any = true;
		if (headings) {
			sh.out('');
			sh.out('******************************');
			sh.out(entryName(e));
			sh.out('');
		}
		for (const h of hits) sh.out(h);
	}
	if (!any && files.length) return sh.msg('%SEARCH-I-NOMATCHES, no strings matched', 0x08d78053);
	return status;
}

/** Line-by-line differences: a list of sections, each with the changed lines from both files. */
export function diffLines(a, b) {
	const n = a.length;
	const m = b.length;
	const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
	const sections = [];
	let i = 0;
	let j = 0;
	let cur = null;
	while (i < n || j < m) {
		if (i < n && j < m && a[i] === b[j]) {
			if (cur) {
				// /MERGED=1: show the first matching line after a difference on both sides.
				cur.a.push([i, a[i]]);
				cur.b.push([j, b[j]]);
				sections.push(cur);
				cur = null;
			}
			i++;
			j++;
			continue;
		}
		cur ??= { a: [], b: [], records: 0 };
		if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) cur.b.push([j, b[j++]]);
		else cur.a.push([i, a[i++]]);
		cur.records++;
	}
	if (cur) sections.push(cur);
	return sections;
}

async function differences(sh, c) {
	const resA = sh.resolve(c.params[0][0]);
	const a = resA.error ? undefined : sh.find(resA).find((e) => !e.isDir);
	if (!a) return sh.msg(`%DIFF-F-OPENIN, error opening ${resA.display} as input\n${why(sh, resA)}`);
	let b;
	if (c.params[1]) {
		const resB = sh.resolve(c.params[1][0], { name: a.name, type: a.type });
		b = resB.error ? undefined : sh.find(resB).find((e) => !e.isDir);
		if (!b) return sh.msg(`%DIFF-F-OPENIN, error opening ${resB.display} as input\n${why(sh, resB)}`);
	} else {
		const lower = sh.disk.versions(a.dir, a.name, a.type).find((r) => r.v < a.v);
		if (!lower) return sh.msg(`%DIFF-F-OPENIN, error opening ${fullName(a.dir, a.name, a.type)};-1 as input\n${RMS.FNF}`);
		b = { dir: a.dir, name: a.name, type: a.type, v: lower.v, rec: lower };
	}
	const la = a.rec.text ? a.rec.text.split('\n') : [];
	const lb = b.rec.text ? b.rec.text.split('\n') : [];
	const sections = diffLines(la, lb);
	const row = ([i, t]) => `${String(i + 1).padStart(5)}   ${t}`;
	for (const s of sections) {
		sh.out('************');
		sh.out(`File ${entryName(a)}`);
		for (const r of s.a) sh.out(row(r));
		sh.out('******');
		sh.out(`File ${entryName(b)}`);
		for (const r of s.b) sh.out(row(r));
	}
	if (sections.length) sh.out('************');
	sh.out('');
	sh.out(`Number of difference sections found: ${sections.length}`);
	sh.out(`Number of difference records found: ${sections.reduce((n, s) => n + s.records, 0)}`);
	sh.out('');
	sh.out('DIFFERENCES /IGNORE=()/MERGED=1-');
	sh.out(`    ${entryName(a)}-`);
	sh.out(`    ${entryName(b)}`);
	return 1;
}

// ── Creating and changing files ─────────────────────────────────────────

async function create(sh, c) {
	if (on(c, 'DIRECTORY')) {
		let status = 1;
		for (const spec of c.params[0]) {
			const res = sh.resolve(spec);
			if (res.error || res.wildDir || res.hasName) {
				status = sh.msg(`%CREATE-E-DIRNOTCRE, ${res.display.replace(/[^\]]*$/, '')} directory file not created\n${res.error ? RMS[res.error] : res.wildDir ? RMS.WLD : RMS.SYN}`);
				continue;
			}
			const key = res.dirKey;
			const shown = `${DEVICE}:${dirString(key)}`;
			if (key === '' || sh.disk.hasDir(key)) {
				status = sh.msg(`%CREATE-I-EXISTS, ${shown} already exists`, 0x10000003);
				continue;
			}
			const segs = key.split('.');
			for (let i = 1; i <= segs.length; i++) {
				const k = segs.slice(0, i).join('.');
				if (!sh.disk.hasDir(k)) {
					sh.disk.mkdir(k);
					if (on(c, 'LOG')) sh.msg(`%CREATE-I-CREATED, ${DEVICE}:${dirString(k)} created`);
				}
			}
		}
		return status;
	}

	const spec = c.params[0][0];
	const res = sh.resolve(spec);
	if (res.error || res.wild || !res.given.name || !sh.disk.hasDir(res.dirKey)) {
		return sh.msg(`%CREATE-E-OPENOUT, error opening ${res.display} as output\n${res.error ? RMS[res.error] : res.wild ? RMS.WLD : !res.given.name ? RMS.SYN : RMS.DNF}`);
	}
	const version = res.version?.kind === 'num' ? res.version.n : undefined;
	if (version !== undefined && sh.disk.versions(res.dirKey, res.name, res.type).some((r) => r.v === version)) {
		return sh.msg(`%CREATE-E-OPENOUT, error opening ${res.display} as output\n${RMS.FEX}`);
	}
	const lines = [];
	for (;;) {
		const line = await sh.readData('');
		if (line === null) break;
		lines.push(line);
	}
	sh.disk.write(res.dirKey, res.name, res.type, lines.join('\n'), { v: version, prot: sh.defaultProt });
	return 1;
}

/** Ask "..., delete? [N]:" and return 'yes', 'no', 'all' or 'quit'. */
async function confirm(sh, what, verb) {
	const a = ((await sh.io.readLine(`${what}, ${verb}? [N]: `)) ?? 'Q').trim().toUpperCase();
	sh.checkInterrupt();
	if (/^(Y|YES|T|TRUE|1)$/.test(a)) return 'yes';
	if (/^(A|ALL)$/.test(a)) return 'all';
	if (/^(Q|QUIT)$/.test(a)) return 'quit';
	return 'no';
}

async function deleteCmd(sh, c) {
	if (on(c, 'SYMBOL')) return deleteSymbol(sh, c);
	let status = 1;
	let count = 0;
	let total = 0;
	let ask = on(c, 'CONFIRM');
	for (const spec of c.params[0]) {
		const res = sh.resolve(spec);
		if (!res.error && !res.version) {
			status = sh.msg('%DELETE-E-DELVER, explicit version number or wild card required');
			continue;
		}
		const found = res.error ? [] : sh.find(res);
		if (!found.length) {
			status = sh.msg(`%DELETE-W-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
			continue;
		}
		for (const e of found) {
			if (ask) {
				const a = await confirm(sh, entryName(e), 'delete');
				if (a === 'quit') return status;
				if (a === 'no') continue;
				if (a === 'all') ask = false;
			}
			const r = removeEntry(sh, e, 'DELETE');
			if (r !== 1) {
				status = r;
				continue;
			}
			count++;
			total += used(e);
			if (on(c, 'LOG')) sh.msg(`%DELETE-I-FILDELETED, ${entryName(e)} deleted (${plural(used(e), 'block')})`);
		}
	}
	if (on(c, 'LOG') && count > 1) sh.msg(`%DELETE-I-TOTAL, ${plural(count, 'file')} deleted (${plural(total, 'block')})`);
	return status;
}

/** Delete one file or empty directory, checking protection. Returns 1 or an error status. */
function removeEntry(sh, e, verb) {
	const notDel = `%${verb}-W-FILNOTDEL, error deleting ${entryName(e)}`;
	if (!e.rec.prot.O.includes('D')) return sh.msg(`${notDel}\n${RMS.PRV}`);
	if (e.isDir) {
		if (!sh.disk.isEmptyDir(e.key)) return sh.msg(`${notDel}\n-RMS-E-MKD, ACP could not mark file for deletion\n-SYSTEM-W-DIRNOTEMPTY, directory file is not empty`);
		sh.disk.rmdir(e.key);
	} else sh.disk.remove(e.dir, e.name, e.type, e.v);
	return 1;
}

function deleteSymbol(sh, c) {
	const global = on(c, 'GLOBAL');
	if (on(c, 'ALL')) {
		if (global) sh.globals.clear();
		else sh.frame.locals.clear();
		return 1;
	}
	let status = 1;
	for (const name of c.params[0] ?? []) {
		const table = global ? sh.globals : sh.frame.locals;
		if (!table.delete(name)) status = sh.msg(`%DCL-W-UNDSYM, undefined symbol - check validity and spelling\n \\${name}\\`);
	}
	return status;
}

async function purge(sh, c) {
	const keep = Math.max(1, Number(qval(c, 'KEEP')) || 1);
	let count = 0;
	let total = 0;
	let status = 1;
	for (const spec of c.params[0] ?? ['*.*;*']) {
		const res = sh.resolve(spec, { name: '*', type: '*' });
		if (res.error || !res.dirs.length) {
			status = sh.msg(`%PURGE-W-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
			continue;
		}
		const found = sh.disk.search(res.dirs, res.name || '*', res.type || '*', { kind: 'wild' }).filter((e) => !e.isDir);
		const seen = new Map();
		for (const e of found) {
			const k = `${e.dir}|${e.name}.${e.type}`;
			seen.set(k, (seen.get(k) ?? 0) + 1);
			if (seen.get(k) <= keep) continue;
			const r = removeEntry(sh, e, 'PURGE');
			if (r !== 1) {
				status = r;
				continue;
			}
			count++;
			total += used(e);
			if (on(c, 'LOG')) sh.msg(`%PURGE-I-FILPURGED, ${entryName(e)} deleted (${plural(used(e), 'block')})`);
		}
	}
	if (!count) return status === 1 ? sh.msg('%PURGE-W-NOFILPURG, no files purged') : status;
	if (on(c, 'LOG') && count > 1) sh.msg(`%PURGE-I-TOTAL, ${plural(count, 'file')} deleted (${plural(total, 'block')})`);
	return status;
}

/** Input files for COPY, RENAME and APPEND, with a SEARCHFAIL message for each spec that finds nothing. */
function inputs(sh, c, verb) {
	const out = [];
	let status = 1;
	for (const spec of c.params[0]) {
		const res = sh.resolve(spec);
		const found = res.error ? [] : sh.find(res);
		if (!found.length) status = sh.msg(`%${verb}-W-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
		out.push(...found);
	}
	return { files: out, status };
}

/** Where an input file goes: the output spec's parts, with * and missing parts taken from the input. */
function target(out, e) {
	const name = !out.given.name || out.name === '*' || out.name === '' ? e.name : out.name;
	const type = !out.given.type || out.type === '*' ? e.type : out.type;
	return { dir: out.dirKey, name, type };
}

const outputWild = (out) => /[*%]/.test(out.name.replace(/^\*$/, '')) || /[*%]/.test(out.type.replace(/^\*$/, ''));

async function copy(sh, c) {
	const out = sh.resolve(c.params[1][0]);
	if (out.error || out.wildDir || outputWild(out) || !sh.disk.hasDir(out.dirKey)) {
		return sh.msg(`%COPY-E-OPENOUT, error opening ${out.display} as output\n${out.error ? RMS[out.error] : out.wildDir || outputWild(out) ? RMS.WLD : RMS.DNF}`);
	}
	const { files, status: s0 } = inputs(sh, c, 'COPY');
	let status = s0;
	const plain = files.filter((e) => !e.isDir);
	for (const e of files.filter((x) => x.isDir)) status = sh.msg(`%COPY-W-NOTCOPIED, ${entryName(e)} not copied\n-SYSTEM-W-ACCONFLICT, file access conflict`);
	const concat = plain.length > 1 && out.given.name && out.name !== '*' && out.type !== '*';
	const groups = concat ? [plain] : plain.map((e) => [e]);
	for (const group of groups) {
		const t = target(out, group[0]);
		const v = out.version?.kind === 'num' ? out.version.n : undefined;
		const text = group.map((e) => e.rec.text).join('\n');
		let nv;
		try {
			nv = sh.disk.write(t.dir, t.name, t.type, text, { v, prot: group[0].rec.prot });
		} catch {
			status = sh.msg(`%COPY-E-OPENOUT, error opening ${fullName(t.dir, t.name, t.type, v)} as output\n${RMS.FEX}`);
			continue;
		}
		if (on(c, 'LOG')) {
			const to = fullName(t.dir, t.name, t.type, nv);
			group.forEach((e, i) => sh.msg(`%COPY-S-${i ? 'APPENDED' : 'COPIED'}, ${entryName(e)} ${i ? 'appended' : 'copied'} to ${to} (${plural(used(e), 'block')})`));
		}
	}
	return status;
}

async function rename(sh, c) {
	const out = sh.resolve(c.params[1][0]);
	if (out.error || out.wildDir || outputWild(out) || !sh.disk.hasDir(out.dirKey)) {
		return sh.msg(`%RENAME-E-OPENOUT, error opening ${out.display} as output\n${out.error ? RMS[out.error] : out.wildDir || outputWild(out) ? RMS.WLD : RMS.DNF}`);
	}
	const { files, status: s0 } = inputs(sh, c, 'RENAME');
	let status = s0;
	const newVersion = !c.quals.get('NEW_VERSION')?.neg;
	for (const e of files) {
		const t = target(out, e);
		if (e.isDir) {
			if (t.type !== 'DIR') {
				status = sh.msg(`%RENAME-E-NOTRENAMED, ${entryName(e)} not renamed\n-RMS-F-TYP, invalid file type`);
				continue;
			}
			const newKey = t.dir ? `${t.dir}.${t.name}` : t.name;
			if (sh.disk.hasDir(newKey) || newKey === e.key || newKey.startsWith(`${e.key}.`)) {
				status = sh.msg(`%RENAME-E-NOTRENAMED, ${entryName(e)} not renamed\n${RMS.FEX}`);
				continue;
			}
			const dirs = sh.disk.state.dirs;
			for (const k of Object.keys(dirs)) {
				if (k === e.key || k.startsWith(`${e.key}.`)) {
					dirs[newKey + k.slice(e.key.length)] = dirs[k];
					delete dirs[k];
				}
			}
			if (sh.defaultDir === e.key || sh.defaultDir.startsWith(`${e.key}.`)) sh.defaultDir = newKey + sh.defaultDir.slice(e.key.length);
			if (on(c, 'LOG')) sh.msg(`%RENAME-I-RENAMED, ${entryName(e)} renamed to ${fullName(t.dir, t.name, 'DIR', 1)}`);
			continue;
		}
		if (t.dir === e.dir && t.name === e.name && t.type === e.type && (out.version?.kind !== 'num' || out.version.n === e.v)) continue;
		const taken = sh.disk.versions(t.dir, t.name, t.type);
		let v = out.version?.kind === 'num' ? out.version.n : e.v;
		if (taken.some((r) => r.v === v)) {
			if (!newVersion || out.version?.kind === 'num') {
				status = sh.msg(`%RENAME-E-NOTRENAMED, ${entryName(e)} not renamed\n${RMS.FEX}`);
				continue;
			}
			v = taken[0].v + 1;
		}
		sh.disk.remove(e.dir, e.name, e.type, e.v);
		const list = (sh.disk.dir(t.dir).files[`${t.name}.${t.type}`] ??= []);
		list.push({ ...e.rec, v });
		list.sort((x, y) => y.v - x.v);
		if (on(c, 'LOG')) sh.msg(`%RENAME-I-RENAMED, ${entryName(e)} renamed to ${fullName(t.dir, t.name, t.type, v)}`);
	}
	return status;
}

async function append(sh, c) {
	const { files, status: s0 } = inputs(sh, c, 'APPEND');
	let status = s0;
	if (!files.length) return status;
	const out = sh.resolve(c.params[1][0]);
	if (out.error || out.wild || !sh.disk.hasDir(out.dirKey)) {
		return sh.msg(`%APPEND-E-OPENOUT, error opening ${out.display} as output\n${out.error ? RMS[out.error] : out.wild ? RMS.WLD : RMS.DNF}`);
	}
	const t = target(out, files[0]);
	let rec = sh.disk.versions(t.dir, t.name, t.type)[0];
	if (!rec) {
		if (!on(c, 'NEW_VERSION')) return sh.msg(`%APPEND-E-OPENOUT, error opening ${fullName(t.dir, t.name, t.type)}; as output\n${RMS.FNF}`);
		sh.disk.write(t.dir, t.name, t.type, '', { prot: sh.defaultProt });
		rec = sh.disk.versions(t.dir, t.name, t.type)[0];
	}
	for (const e of files.filter((x) => !x.isDir)) {
		rec.text = rec.text ? `${rec.text}\n${e.rec.text}` : e.rec.text;
		rec.modified = Date.now();
		if (on(c, 'LOG')) sh.msg(`%APPEND-S-APPENDED, ${entryName(e)} appended to ${fullName(t.dir, t.name, t.type, rec.v)} (${plural(used(e), 'block')})`);
	}
	return status;
}

// ── SET ─────────────────────────────────────────────────────────────────

const NOT_SIM_SET = ['TERMINAL', 'PROCESS', 'PASSWORD', 'FILE', 'HOST', 'MESSAGE', 'CONTROL', 'QUEUE', 'ENTRY', 'SYMBOL', 'ON', 'NOON', 'BROADCAST', 'CLUSTER', 'DEVICE', 'DIRECTORY', 'KEY', 'RESTART_VALUE', 'RIGHTS_LIST', 'SECURITY', 'TIME', 'UIC', 'VOLUME', 'WORKING_SET', 'PRINTER', 'RMS_DEFAULT', 'COMMAND', 'DAY', 'LOGINS', 'AUDIT', 'ACCOUNTING'];
const SET_KEYS = [
	{ name: 'DEFAULT', min: 3 },
	{ name: 'PROMPT', min: 4 },
	{ name: 'PROTECTION', min: 4 },
	{ name: 'VERIFY', min: 3 },
	{ name: 'NOVERIFY', min: 4 },
	...NOT_SIM_SET.map((n) => ({ name: n, min: Math.min(4, n.length), notSim: true }))
];

/** Split "KEYWORD=value" and match the keyword. */
function keyword(sh, raw, list) {
	const eq = raw.indexOf('=');
	const word = (eq >= 0 ? raw.slice(0, eq) : raw).toUpperCase();
	const value = eq >= 0 ? raw.slice(eq + 1) : null;
	const { match, ambiguous } = matchAbbrev(word, list);
	if (ambiguous) return { error: sh.msg(`%DCL-W-ABKEYW, ambiguous keyword - supply more characters\n \\${word}\\`) };
	if (!match) return { error: sh.msg(`%DCL-W-IVKEYW, unrecognized keyword - check validity and spelling\n \\${word}\\`) };
	return { key: match, value };
}

/** Prompt for a missing parameter of a SET or SHOW keyword. */
async function need(sh, c, i, prompt) {
	if (c.params[i]) return c.params[i];
	if (sh.depth > 0) return null;
	for (;;) {
		const a = await sh.io.readLine(prompt);
		sh.checkInterrupt();
		if (a === null) return null;
		const p = parseArgs(a);
		sh.resolveQuals(COMMANDS.find((x) => x.name === c.verb), p.quals, c.quals);
		if (p.params.length) {
			c.params[i] = p.params[0];
			return p.params[0];
		}
	}
}

async function set(sh, c) {
	const { key, value, error } = keyword(sh, c.params[0][0], SET_KEYS);
	if (error) return error;
	if (key.notSim) return sh.sim(`SET ${key.name} exists on OpenVMS, but isn't part of this simulator.`);
	switch (key.name) {
		case 'DEFAULT': {
			const p = await need(sh, c, 1, '_Directory: ');
			if (!p) return 1;
			const res = sh.resolve(p[0]);
			if (res.error === 'DEV') return sh.msg('%SYSTEM-W-NOSUCHDEV, no such device available');
			if (res.error || res.wildDir || res.hasName || res.version) return sh.msg(`%DCL-W-DIRECT, invalid directory syntax - check brackets and other delimiters\n \\${p[0]}\\`);
			sh.defaultDir = res.dirKey;
			return 1;
		}
		case 'PROMPT':
			sh.prompt = value === null || value === '' ? '$ ' : value.slice(0, 32);
			return 1;
		case 'VERIFY':
			sh.verify = true;
			return 1;
		case 'NOVERIFY':
			sh.verify = false;
			return 1;
		case 'PROTECTION': {
			if (value === null) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
			if (on(c, 'DEFAULT')) {
				const p = applyProt(value, sh.defaultProt);
				if (!p) return sh.msg(`%SET-E-INVPROT, invalid protection code\n \\${value}\\`);
				sh.defaultProt = p;
				return 1;
			}
			const files = await need(sh, c, 1, '_File: ');
			if (!files) return 1;
			let status = 1;
			for (const spec of files) {
				const res = sh.resolve(spec);
				const found = res.error ? [] : sh.find(res);
				if (!found.length) {
					status = sh.msg(`%SET-E-SEARCHFAIL, error searching for ${res.display}\n${why(sh, res)}`);
					continue;
				}
				for (const e of found) {
					const p = applyProt(value, e.rec.prot);
					if (!p) return sh.msg(`%SET-E-INVPROT, invalid protection code\n \\${value}\\`);
					if (e.isDir) sh.disk.dir(e.key).prot = p;
					else e.rec.prot = p;
					if (on(c, 'LOG')) sh.msg(`%SET-I-MODIFIED, ${entryName(e)} modified`);
				}
			}
			return status;
		}
	}
	return 1;
}

// ── SHOW ────────────────────────────────────────────────────────────────

const NOT_SIM_SHOW = ['TERMINAL', 'QUEUE', 'MEMORY', 'CPU', 'CLUSTER', 'NETWORK', 'ERROR', 'INTRUSION', 'LICENSE', 'ACCOUNTING', 'AUDIT', 'BROADCAST', 'ENTRY', 'KEY', 'QUOTA', 'WORKING_SET', 'RMS_DEFAULT', 'SECURITY', 'SERVER', 'MAGTAPE', 'PRINTER', 'INTRUSION', 'IMAGE', 'LOGINS', 'ZONE'];
const SHOW_KEYS = [
	{ name: 'DEFAULT', min: 3 },
	{ name: 'DEVICES', min: 3 },
	{ name: 'DAYTIME', min: 2 },
	{ name: 'LOGICAL', min: 3 },
	{ name: 'PROCESS', min: 4 },
	{ name: 'PROTECTION', min: 4 },
	{ name: 'STATUS', min: 2 },
	{ name: 'SYMBOL', min: 2 },
	{ name: 'SYSTEM', min: 2 },
	{ name: 'TIME', min: 2 },
	{ name: 'TRANSLATION', min: 2 },
	{ name: 'USERS', min: 1 },
	...[...new Set(NOT_SIM_SHOW)].map((n) => ({ name: n, min: 4, notSim: true }))
];

const JOB_TABLE = 'LNM$JOB_8D1E6A40';
const TABLE_NAMES = { PROCESS: 'LNM$PROCESS_TABLE', JOB: JOB_TABLE, SYSTEM: 'LNM$SYSTEM_TABLE' };

function showSymbolLine(name, v, global) {
	const eq = global ? '==' : '=';
	if (name === '$STATUS') return `  $STATUS == "%X${(v.v >>> 0).toString(16).toUpperCase().padStart(8, '0')}"`;
	if (name === '$SEVERITY') return `  $SEVERITY == "${v.v}"`;
	if (v.t === 's') return `  ${name} ${eq} "${v.v.replace(/"/g, '""')}"`;
	const n = v.v >>> 0;
	return `  ${name} ${eq} ${v.v}   Hex = ${n.toString(16).toUpperCase().padStart(8, '0')}  Octal = ${n.toString(8).padStart(11, '0')}`;
}

function processLine(pid, name, state, pri, io, cpu, pf, pages, extra = '') {
	return `${pid} ${name.padEnd(15)} ${state.padEnd(5)} ${String(pri).padStart(3)} ${String(io).padStart(9)}   0 ${cpu} ${String(pf).padStart(9)} ${String(pages).padStart(6)}${extra}`;
}

async function show(sh, c) {
	const { key, error } = keyword(sh, c.params[0][0], SHOW_KEYS);
	if (error) return error;
	if (key.notSim) return sh.sim(`SHOW ${key.name} exists on OpenVMS, but isn't part of this simulator.`);
	const now = vmsTime();
	switch (key.name) {
		case 'DEFAULT': {
			sh.out(`  ${DEVICE}:${dirString(sh.defaultDir)}`);
			if (!sh.disk.hasDir(sh.defaultDir)) return sh.msg(`%DCL-I-INVDEF, ${DEVICE}:${dirString(sh.defaultDir)} does not exist`, 0x10000003);
			return 1;
		}
		case 'TIME':
		case 'DAYTIME':
			sh.out(`  ${vmsTime(Date.now(), false).trimStart()}`);
			return 1;
		case 'PROTECTION':
			sh.out(`  ${protWords(sh.defaultProt)}`);
			return 1;
		case 'SYMBOL': {
			const names = c.params[1] ?? [];
			const global = on(c, 'GLOBAL');
			const local = on(c, 'LOCAL');
			const locals = new Map();
			for (const f of sh.frames) for (const [k, v] of f.locals) locals.set(k, v);
			const rows = [];
			if (!names.length || on(c, 'ALL')) {
				if (!global) for (const k of [...sh.frame.locals.keys()].sort()) rows.push(showSymbolLine(k, sh.frame.locals.get(k), false));
				if (!local && (global || !on(c, 'ALL'))) for (const k of [...sh.globals.keys()].sort()) rows.push(showSymbolLine(k, sh.globals.get(k), true));
				if (!rows.length) return sh.msg('%DCL-W-UNDSYM, undefined symbol - check validity and spelling');
				rows.forEach((r) => sh.out(r));
				return 1;
			}
			let status = 1;
			for (const name of names) {
				if (name === '$STATUS' || name === '$SEVERITY') {
					sh.out(showSymbolLine(name, sh.lookup(name), true));
					continue;
				}
				const re = new RegExp(`^${name.replace(/[$]/g, '\\$').replace(/\*/g, '.*').replace(/%/g, '.')}$`);
				let found = 0;
				if (!global) {
					for (const k of [...locals.keys()].sort()) {
						if (re.test(k)) {
							sh.out(showSymbolLine(k, locals.get(k), false));
							found++;
						}
					}
				}
				if (!local) {
					for (const k of [...sh.globals.keys()].sort()) {
						if (re.test(k) && (!locals.has(k) || global || /[*%]/.test(name))) {
							sh.out(showSymbolLine(k, sh.globals.get(k), true));
							found++;
						}
					}
				}
				if (!found) status = sh.msg(`%DCL-W-UNDSYM, undefined symbol - check validity and spelling\n \\${name}\\`);
			}
			return status;
		}
		case 'LOGICAL':
		case 'TRANSLATION': {
			const pick = ['PROCESS', 'JOB', 'SYSTEM'].filter((t) => on(c, t));
			const tables = pick.length && key.name === 'LOGICAL' ? pick : ['PROCESS', 'JOB', 'SYSTEM'];
			const names = c.params[1] ?? [];
			if (key.name === 'TRANSLATION' && !names.length) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
			if (!names.length) {
				for (const t of tables) {
					sh.out(`(${TABLE_NAMES[t]})`);
					sh.out('');
					for (const [k, v] of [...sh.lnm[t]].sort(([a], [b]) => (a < b ? -1 : 1))) sh.out(`  "${k}" = "${v}"`);
					sh.out('');
				}
				return 1;
			}
			let status = 1;
			for (const raw of names) {
				const name = raw.replace(/:$/, '');
				const re = new RegExp(`^${name.replace(/[$]/g, '\\$').replace(/\*/g, '.*').replace(/%/g, '.')}$`);
				let found = 0;
				for (const t of tables) {
					for (const [k, v] of [...sh.lnm[t]].sort(([a], [b]) => (a < b ? -1 : 1))) {
						if (!re.test(k)) continue;
						found++;
						if (key.name === 'TRANSLATION') sh.out(`   ${k} = "${v}" (${TABLE_NAMES[t]})`);
						else sh.out(`   "${k}" = "${v}" (${TABLE_NAMES[t]})`);
						if (key.name === 'TRANSLATION') break;
					}
					if (found && key.name === 'TRANSLATION') break;
				}
				if (!found) status = sh.msg(`%SHOW-S-NOTRAN, no translation for logical name ${name}`, 0x10000001);
			}
			return status;
		}
		case 'SYSTEM': {
			const up = Date.now() - (sh.loginTime - 3 * 86400000 - 4 * 3600000);
			const d = Math.floor(up / 86400000);
			const hms = new Date(up).toISOString().slice(11, 19);
			sh.out(`OpenVMS ${VERSION}  on node ${NODE}  ${now}  Uptime  ${d} ${hms}`);
			sh.out('  Pid    Process Name    State  Pri      I/O       CPU       Page flts  Pages');
			const rows = [
				['00000401', 'SWAPPER', 'HIB', 16, 0, '00:00:00.08', 0, 0],
				['00000405', 'CLUSTER_SERVER', 'HIB', 13, 75, '00:00:00.21', 412, 548],
				['00000406', 'CONFIGURE', 'HIB', 10, 30, '00:00:00.03', 190, 236],
				['00000408', 'LANACP', 'HIB', 12, 87, '00:00:00.11', 621, 766],
				['0000040A', 'IPCACP', 'HIB', 10, 6, '00:00:00.01', 182, 204],
				['0000040B', 'ERRFMT', 'HIB', 8, 2210, '00:00:00.34', 236, 284],
				['0000040D', 'OPCOM', 'HIB', 8, 1404, '00:00:00.42', 905, 600],
				['0000040E', 'AUDIT_SERVER', 'HIB', 10, 190, '00:00:00.37', 1520, 1790],
				['0000040F', 'JOB_CONTROL', 'HIB', 10, 822, '00:00:00.18', 412, 588],
				['00000411', 'SECURITY_SERVER', 'HIB', 10, 270, '00:00:00.59', 2401, 2076],
				['00000412', 'TP_SERVER', 'HIB', 10, 9031, '00:00:01.92', 311, 360],
				['00000414', 'TCPIP$INETACP', 'HIB', 10, 418, '00:00:00.15', 360, 410],
				['00000415', 'TCPIP$SSH', 'LEF', 6, 1288, '00:00:00.97', 2810, 3104]
			];
			for (const r of rows) sh.out(processLine(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]));
			sh.out(processLine('00000421', USER, 'CUR', 4, 310 + sh.history.length * 3, '00:00:00.31', 1460, 1090, '  '));
			return 1;
		}
		case 'USERS':
			sh.out(`      OpenVMS User Processes at ${now}`);
			sh.out('    Total number of users = 1,  number of processes = 1');
			sh.out('');
			sh.out(' Username  Interactive  Subprocess   Batch');
			sh.out(` ${USER.padEnd(9)}          1`);
			return 1;
		case 'PROCESS':
			sh.out('');
			sh.out(`${now}   User: ${USER.padEnd(16)} Process ID:   00000421`);
			sh.out(`                          Node: ${NODE.padEnd(16)} Process name: "${USER}"`);
			sh.out('');
			sh.out('Terminal:           FTA1:');
			sh.out(`User Identifier:    [${USER}]`);
			sh.out('Base priority:      4');
			sh.out(`Default file spec:  ${DEVICE}:${dirString(sh.defaultDir)}`);
			sh.out('Number of Kthreads: 1');
			return 1;
		case 'STATUS': {
			const cpu = (sh.history.length * 0.03 + 0.21).toFixed(2).padStart(5, '0');
			sh.out(`Status on ${now}    Elapsed CPU :  0 00:00:${cpu}`);
			sh.out(`Buff. I/O :${String(120 + sh.history.length * 7).padStart(9)}    Cur. ws. :     2048    Open files :         1`);
			sh.out(` Dir. I/O :${String(34 + sh.history.length * 2).padStart(9)}    Phys. Mem. :   1090    Page Faults :${String(1460 + sh.history.length * 11).padStart(10)}`);
			return 1;
		}
		case 'DEVICES': {
			let usedBlocks = 0;
			for (const d of Object.values(sh.disk.state.dirs)) for (const vs of Object.values(d.files)) for (const r of vs) usedBlocks += alloc(blocks(r.text));
			sh.out('');
			sh.out('Device                  Device           Error    Volume         Free  Trans Mnt');
			sh.out(' Name                   Status           Count     Label        Blocks Count Cnt');
			sh.out(`${NODE}$DKA0:             Mounted              0  X86SYS       12480160   312   1`);
			sh.out(`${NODE}$DKA100:           Mounted              0  USERDISK     ${String(2097152 - usedBlocks).padStart(8)}     1   1`);
			return 1;
		}
	}
	return 1;
}

// ── Logical names ───────────────────────────────────────────────────────

function lnmTable(sh, c) {
	if (on(c, 'SYSTEM') || on(c, 'GROUP')) return { error: sh.msg('%SYSTEM-F-NOPRIV, insufficient privilege or object protection violation') };
	return { table: on(c, 'JOB') ? 'JOB' : 'PROCESS' };
}

function defineName(sh, c, name, values) {
	const { table, error } = lnmTable(sh, c);
	if (error) return error;
	const n = name.replace(/:$/, '');
	const had = sh.lnm[table].has(n);
	sh.lnm[table].set(n, values.join(','));
	if (had) return sh.msg(`%DCL-I-SUPERSEDE, previous value of ${n} has been superseded`, 0x10000003);
	return 1;
}

// ── Command procedures and control flow ─────────────────────────────────

async function at(sh, c) {
	const raw = c.params[0]?.[0] ?? '';
	const res = sh.resolve(raw, { type: 'COM' });
	const found = res.error || res.wild ? [] : sh.find(res).filter((e) => !e.isDir);
	if (!found.length) return sh.msg(`%DCL-E-OPENIN, error opening ${res.display} as input\n${res.wild ? RMS.WLD : why(sh, res)}`);
	const e = found[0];
	const params = c.params.slice(1).map((p) => p.join(','));
	return sh.runProcedure(entryName(e), e.rec.text, params);
}

function exitCmd(sh, c) {
	const f = sh.frame;
	const v = c.raw.trim() ? toInt(sh.eval(c.raw)) : sh.status;
	if (f.lines) f.exitStatus = v;
	return v;
}

function gotoCmd(sh, c) {
	const label = c.raw.trim().toUpperCase();
	if (!sh.frame.lines) return sh.msg(`%DCL-W-USGOTO, target of GOTO not found - check spelling and presence of label\n \\${label}\\`);
	sh.frame.jump = label;
	return sh.status;
}

function gosubCmd(sh, c) {
	const f = sh.frame;
	const label = c.raw.trim().toUpperCase();
	if (!f.lines) return sh.msg(`%DCL-W-USGOTO, target of GOTO not found - check spelling and presence of label\n \\${label}\\`);
	f.gosub.push(f.pc);
	f.jump = label;
	return 1;
}

function returnCmd(sh, c) {
	const f = sh.frame;
	if (!f.lines || !f.gosub.length) return sh.sim('RETURN without a matching GOSUB.');
	f.pc = f.gosub.pop();
	return c.raw.trim() ? toInt(sh.eval(c.raw)) : 1;
}

function onCmd(sh, c) {
	const m = c.raw.trim().match(/^([A-Z_]+)\s+THEN\s+(.*)$/i);
	if (!m) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
	const cond = matchAbbrev(m[1].toUpperCase(), [{ name: 'WARNING' }, { name: 'ERROR' }, { name: 'SEVERE_ERROR' }, { name: 'CONTROL_Y' }]).match;
	if (!cond) return sh.msg(`%DCL-W-IVKEYW, unrecognized keyword - check validity and spelling\n \\${m[1].toUpperCase()}\\`);
	if (cond.name === 'CONTROL_Y') return sh.sim('ON CONTROL_Y isn\'t part of this simulator; Ctrl-Y always stops the procedure.');
	const act = m[2].trim().toUpperCase();
	const action = /^(EXIT|STOP)\b/.test(act) ? 'EXIT' : /^CONTINUE\b/.test(act) ? 'CONTINUE' : /^GOTO\s+\S+/.test(act) ? `GOTO ${act.split(/\s+/)[1]}` : null;
	if (!action) return sh.sim('ON ... THEN accepts EXIT, CONTINUE or GOTO label here.');
	sh.frame.on = { level: { WARNING: 0, ERROR: 2, SEVERE_ERROR: 4 }[cond.name], action };
	return 1;
}

async function ifCmd(sh, c) {
	const i = findKeyword(c.raw, 'THEN');
	if (i < 0) return sh.sim('A block IF (IF, THEN, ELSE and ENDIF on separate lines) only works in a command procedure here. At the $ prompt, put the command on the same line: IF condition THEN command');
	const cond = c.raw.slice(0, i);
	const then = c.raw.slice(i + 4);
	if (!cond.trim()) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
	if (truthy(sh.eval(cond))) return then.trim() ? sh.exec(then) : sh.status;
	return sh.status;
}

const blockOnly = (word) => (sh) => sh.sim(`${word} belongs to a block IF, which only works in a command procedure here.`);

async function write(sh, c) {
	const m = c.raw.match(/^\s*((?:\/[A-Z]+\s*)*)([A-Z0-9$_:]+)\s*(.*)$/i);
	if (!m) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
	const channel = m[2].toUpperCase().replace(/:$/, '');
	if (!['SYS$OUTPUT', 'SYS$ERROR', 'TT', 'SYS$COMMAND'].includes(channel)) {
		return sh.msg(`%DCL-W-UNDFIL, file has not been opened by DCL - check logical name\n \\${channel}\\`);
	}
	if (!m[3].trim()) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
	const text = splitTop(m[3])
		.map((e) => toStr(sh.eval(e)))
		.join('');
	sh.out(text);
	return 1;
}

async function inquire(sh, c) {
	const parsed = c.raw.match(/^\s*((?:\/[A-Z]+\s*)*)([A-Z$_][A-Z0-9$_]*)\s*(.*)$/i);
	if (!parsed) return sh.msg('%DCL-W-INSFPRM, missing command parameters - supply all required parameters');
	const quals = parsed[1].toUpperCase();
	const name = parsed[2].toUpperCase();
	let prompt = parsed[3].trim();
	if (prompt.startsWith('"')) prompt = stringAssignValue(prompt);
	else prompt = prompt.toUpperCase();
	if (!prompt) prompt = name;
	if (!/\/NOP/.test(quals)) prompt += ': ';
	const answer = await sh.io.readLine(prompt);
	sh.checkInterrupt();
	sh.setSymbol(name, str(answer === null ? '' : stringAssignValue(answer)), /\/G/.test(quals));
	return 1;
}

async function wait(sh, c) {
	const ms = parseDelta(c.params[0][0]);
	if (ms === null) return sh.msg(`%CLI-W-IVDTIME, invalid delta time - use DDDD-HH:MM:SS.CC format\n \\${c.params[0][0]}\\`);
	await sh.sleep(ms);
	return 1;
}

// ── Editors ─────────────────────────────────────────────────────────────

const lineCount = (text) => (text === '' ? 0 : text.split('\n').length);

/** EDIT/EDT runs EDT in line mode; EDIT/TPU opens EVE, which the page draws full screen. */
async function edit(sh, c) {
	const eve = on(c, 'TPU') && !on(c, 'EDT');
	const fac = eve ? 'TPU' : 'EDT';
	const res = sh.resolve(c.params[0][0]);
	if (res.error || res.wild || !res.given.name || !sh.disk.hasDir(res.dirKey)) {
		return sh.msg(`%${fac}-F-OPENIN, error opening ${res.display} as input\n${res.error ? RMS[res.error] : res.wild ? RMS.WLD : !res.given.name ? RMS.SYN : RMS.DNF}`);
	}
	const found = sh.find(res).filter((e) => !e.isDir);
	if (sh.find(res).some((e) => e.isDir)) return sh.msg(`%${fac}-F-OPENIN, error opening ${res.display} as input\n-RMS-F-ORG, invalid file organization value`);
	const rec = found[0]?.rec ?? null;
	if (rec && !rec.prot.O.includes('R')) return sh.msg(`%${fac}-F-OPENIN, error opening ${entryName(found[0])} as input\n${RMS.PRV}`);
	const readOnly = on(c, 'READ_ONLY') || (!!rec && !rec.prot.O.includes('W'));
	const f = { dir: res.dirKey, name: res.name, type: res.type, rec, readOnly, display: res.display };

	if (!eve) return runEdt(sh, f);

	if (!sh.io.editScreen) return sh.sim('EVE needs the full-screen terminal on the Try (Simulated) OpenVMS page.');
	const result = await sh.io.editScreen({
		buffer: `${f.name}.${f.type}`,
		file: rec ? fullName(f.dir, f.name, f.type, found[0].v) : `${DEVICE}:${dirString(f.dir)}${f.name}.${f.type};`,
		text: rec?.text ?? '',
		isNew: !rec,
		readOnly,
		/** INCLUDE FILE: the text of another file, or an error message. */
		include: (spec) => {
			const r = sh.resolve(spec);
			const e = r.error ? undefined : sh.find(r).find((x) => !x.isDir);
			return e ? { text: e.rec.text } : { error: `File not found: ${r.display}` };
		},
		/** WRITE FILE: save the buffer under another name. */
		writeFile: (spec, text) => {
			const r = sh.resolve(spec, { name: f.name, type: f.type });
			if (r.error || r.wild || !sh.disk.hasDir(r.dirKey)) return `Error opening ${r.display} as output`;
			const v = sh.disk.write(r.dirKey, r.name, r.type, text, { prot: sh.defaultProt });
			return `${lineCount(text)} lines written to file ${fullName(r.dirKey, r.name, r.type, v)}`;
		}
	});
	sh.checkInterrupt();
	if (result.action !== 'exit' || readOnly) return 1;
	if (rec && result.text === rec.text) {
		sh.out('No changes made; no new version written');
		return 1;
	}
	const v = sh.disk.write(f.dir, f.name, f.type, result.text, { prot: rec?.prot ?? sh.defaultProt });
	const n = lineCount(result.text);
	sh.out(`${n} line${n === 1 ? '' : 's'} written to file ${fullName(f.dir, f.name, f.type, v)}`);
	return 1;
}

// ── Session ─────────────────────────────────────────────────────────────

async function help(sh, c) {
	const show = (topic) => {
		const t = HELP[topic];
		sh.out('');
		sh.out(topic);
		sh.out('');
		for (const line of t.trim().split('\n')) sh.out(`  ${line}`);
		sh.out('');
	};
	const list = () => {
		sh.out('');
		sh.out('  Information available:');
		sh.out('');
		const names = Object.keys(HELP);
		for (let i = 0; i < names.length; i += 6) sh.out(`  ${names.slice(i, i + 6).map((n) => n.padEnd(13)).join('').trimEnd()}`);
		sh.out('');
	};
	const lookup = (word) => matchAbbrev(word.toUpperCase(), Object.keys(HELP).map((n) => ({ name: n }))).match?.name;

	const words = (c.params ?? []).map((p) => p.join(','));
	if (!words.length) {
		sh.out('');
		for (const line of HELP_INTRO.split('\n')) sh.out(`  ${line}`);
		list();
	} else {
		const t = lookup(words[0]);
		if (t) show(t);
		else {
			sh.out('');
			sh.out(`  Sorry, no documentation on ${words.join(' ')}`);
			list();
		}
	}
	if (c.quals.get('PROMPT')?.neg) return 1;
	if (sh.depth > 0) return 1;
	for (;;) {
		const a = await sh.io.readLine('Topic? ');
		sh.checkInterrupt();
		if (a === null || !a.trim()) return 1;
		if (a.trim() === '?') {
			list();
			continue;
		}
		const t = lookup(a.trim().split(/\s+/)[0]);
		if (t) show(t);
		else {
			sh.out('');
			sh.out(`  Sorry, no documentation on ${a.trim().toUpperCase()}`);
			list();
		}
	}
}

const HELP_INTRO = `This is the simulator's own help, covering the commands it knows.
On a real OpenVMS system, HELP covers every command, utility and system service.

Type the name of a command, or ? to see this list again.
Press Return on its own to leave HELP.`;

function recall(sh, c) {
	if (on(c, 'ERASE')) {
		sh.history.length = 0;
		return 1;
	}
	// The RECALL command itself was just added to the history; skip it.
	const past = sh.history.slice(1);
	if (on(c, 'ALL')) {
		past.forEach((h, i) => sh.out(`${String(i + 1).padStart(3)} ${h}`));
		return 1;
	}
	const arg = c.params[0]?.[0];
	let hit;
	if (!arg) hit = past[0];
	else if (/^\d+$/.test(arg)) hit = past[Number(arg) - 1];
	else hit = past.find((h) => h.toUpperCase().startsWith(arg));
	if (!hit) return sh.msg('%RECALL-W-CMDNOTFND, command not found');
	sh.history.shift();
	sh.prefill = hit;
	return 1;
}

function logout(sh) {
	sh.out(`  ${USER.padEnd(12)} logged out at ${vmsTime()}`);
	sh.loggedOut = true;
	return 1;
}

// ── The verb table ──────────────────────────────────────────────────────

const OUT_QUALS = ['OUTPUT', 'PAGE'];

/** @type {Array<any>} */
export const COMMANDS = [
	{ name: '@', run: at },
	{ name: 'APPEND', min: 2, quals: ['LOG', 'NEW_VERSION'], max: 2, run: append },
	{ name: 'ASSIGN', min: 2, quals: ['PROCESS', 'JOB', 'GROUP', 'SYSTEM', 'LOG'], max: 2, run: (sh, c) => defineName(sh, c, c.params[1][0], c.params[0]) },
	{ name: 'COPY', min: 2, quals: ['LOG', 'CONFIRM'], max: 2, run: copy },
	{ name: 'CREATE', min: 2, quals: ['DIRECTORY', 'LOG'], max: 1, run: create },
	{ name: 'DEASSIGN', min: 3, quals: ['PROCESS', 'JOB', 'GROUP', 'SYSTEM', 'ALL'], max: 1, run: deassign },
	{ name: 'DEFINE', min: 3, quals: ['PROCESS', 'JOB', 'GROUP', 'SYSTEM', 'LOG'], max: 2, run: (sh, c) => defineName(sh, c, c.params[0][0], c.params[1]) },
	{ name: 'DELETE', min: 3, quals: ['LOG', 'CONFIRM', 'SYMBOL', 'GLOBAL', 'LOCAL', 'ALL'], max: 1, run: deleteCmd },
	{ name: 'DIFFERENCES', min: 3, quals: [...OUT_QUALS], max: 2, run: (sh, c) => withOutput(sh, c, () => differences(sh, c)) },
	{ name: 'DIRECTORY', min: 3, quals: ['SIZE', 'DATE', 'FULL', 'BRIEF', 'COLUMNS', 'OWNER', 'PROTECTION', 'TOTAL', 'VERSIONS', 'SINCE', 'BEFORE', 'HEADING', 'TRAILING', ...OUT_QUALS], run: (sh, c) => withOutput(sh, c, () => directory(sh, c)) },
	{ name: 'EDIT', min: 2, quals: ['TPU', 'EDT', 'READ_ONLY', 'CREATE'], max: 1, run: edit },
	{ name: 'ELSE', min: 4, raw: true, run: blockOnly('ELSE') },
	{ name: 'ENDIF', min: 4, raw: true, run: blockOnly('ENDIF') },
	{ name: 'EXIT', min: 3, raw: true, run: exitCmd },
	{ name: 'GOSUB', min: 4, raw: true, run: gosubCmd },
	{ name: 'GOTO', min: 4, raw: true, run: gotoCmd },
	{ name: 'HELP', min: 1, quals: ['PROMPT', 'PAGE'], run: help },
	{ name: 'IF', min: 2, raw: true, run: ifCmd },
	{ name: 'INQUIRE', min: 3, raw: true, run: inquire },
	{ name: 'LOGOUT', min: 2, quals: ['BRIEF', 'FULL'], max: 0, run: logout },
	{ name: 'ON', min: 2, raw: true, run: onCmd },
	{ name: 'PURGE', min: 2, quals: ['KEEP', 'LOG', 'CONFIRM'], max: 1, run: purge },
	{ name: 'RECALL', min: 3, quals: ['ALL', 'ERASE'], max: 1, run: recall },
	{ name: 'RENAME', min: 3, quals: ['LOG', 'NEW_VERSION', 'CONFIRM'], max: 2, run: rename },
	{ name: 'RETURN', min: 3, raw: true, run: returnCmd },
	{ name: 'SEARCH', min: 3, quals: ['EXACT', 'NUMBERS', 'MATCH', 'HEADING', ...OUT_QUALS], max: 2, run: (sh, c) => withOutput(sh, c, () => search(sh, c)) },
	{ name: 'SET', min: 3, quals: ['DEFAULT', 'LOG'], run: set },
	{ name: 'SHOW', min: 2, quals: ['GLOBAL', 'LOCAL', 'ALL', 'PROCESS', 'JOB', 'SYSTEM', 'FULL'], run: show },
	{ name: 'THEN', min: 4, raw: true, run: blockOnly('THEN') },
	{ name: 'TYPE', min: 2, quals: [...OUT_QUALS], run: (sh, c) => withOutput(sh, c, () => type(sh, c)) },
	{ name: 'WAIT', min: 2, max: 1, run: wait },
	{ name: 'WRITE', min: 2, raw: true, run: write }
];

// Required parameters, and the prompts DCL shows when they're missing.
const PROMPTS = {
	'@': ['_File: '],
	APPEND: ['_From: ', '_To: '],
	ASSIGN: ['_Equivalence name: ', '_Logical name: '],
	COPY: ['_From: ', '_To: '],
	CREATE: ['_File: '],
	DEASSIGN: ['_Logical name: '],
	DEFINE: ['_Logical name: ', '_Equivalence name: '],
	DELETE: ['_File: '],
	DIFFERENCES: ['_File 1: '],
	EDIT: ['_File: '],
	RENAME: ['_From: ', '_To: '],
	SEARCH: ['_File: ', '_String: '],
	SET: ['_What: '],
	SHOW: ['_What: '],
	TYPE: ['_File: '],
	WAIT: ['_Time: ']
};
for (const c of COMMANDS) {
	if (PROMPTS[c.name]) {
		c.prompts = PROMPTS[c.name];
		c.minParams = PROMPTS[c.name].length;
	}
}

function deassign(sh, c) {
	if (on(c, 'SYSTEM') || on(c, 'GROUP')) return sh.msg('%SYSTEM-F-NOPRIV, insufficient privilege or object protection violation');
	const table = on(c, 'JOB') ? 'JOB' : 'PROCESS';
	if (on(c, 'ALL')) {
		sh.lnm[table].clear();
		return 1;
	}
	const name = (c.params[0]?.[0] ?? '').replace(/:$/, '');
	if (!sh.lnm[table].delete(name)) return sh.msg('%SYSTEM-F-NOLOGNAM, no logical name match');
	return 1;
}

// Real OpenVMS verbs the simulator doesn't model. They answer with a SIM message instead of "unrecognized".
const NOT_SIMULATED = {
	RUN: 'There are no programs to run here.',
	MAIL: '',
	PRINT: 'There are no print queues here.',
	SUBMIT: 'There are no batch queues here.',
	SPAWN: '',
	ATTACH: '',
	LINK: '',
	MOUNT: '',
	DISMOUNT: '',
	BACKUP: '',
	ANALYZE: '',
	INSTALL: '',
	PHONE: '',
	CC: '',
	FORTRAN: '',
	MACRO: '',
	PASCAL: '',
	BASIC: '',
	COBOL: '',
	MCR: '',
	OPEN: '',
	CLOSE: '',
	READ: 'Use INQUIRE to ask the user for a value.',
	SORT: '',
	MERGE: '',
	CONVERT: '',
	DUMP: '',
	EXAMINE: '',
	DEPOSIT: '',
	LIBRARY: '',
	MESSAGE: '',
	PATCH: '',
	REPLY: '',
	REQUEST: '',
	STOP: '',
	START: '',
	SYNCHRONIZE: '',
	UNLOCK: '',
	LICENSE: '',
	CONTINUE: '',
	CALL: 'Use GOSUB and RETURN in a command procedure.',
	ACCOUNTING: '',
	ALLOCATE: '',
	DEALLOCATE: '',
	INITIALIZE: '',
	PRODUCT: '',
	TCPIP: '',
	MONITOR: '',
	PIPE: '',
	SET_HOST: '',
	CONNECT: '',
	DISCONNECT: '',
	DECK: '',
	EOD: '',
	EOJ: '',
	DEBUG: '',
	PRINTER: ''
};
for (const [name, hint] of Object.entries(NOT_SIMULATED)) {
	if (name.includes('_')) continue;
	const short = ['RUN', 'MAIL', 'PRINT', 'SUBMIT', 'SPAWN', 'LINK', 'MOUNT', 'BACKUP', 'CC'].includes(name);
	COMMANDS.push({ name, min: short ? Math.min(2, name.length) : Math.min(4, name.length), notSim: hint, raw: true });
}

