// The simulator's disk: one device, a tree of directories, and files that keep every version.
// Everything here is plain data so the whole disk can be saved to localStorage as JSON.
//
// Directory keys are the path inside the brackets: 'DEMO.PROJECTS' for [DEMO.PROJECTS],
// and '' for the top of the disk, [000000].

export const DEVICE = 'DISK$USER';
export const BLOCK = 512;
export const MAX_VERSION = 32767;

export const DEFAULT_FILE_PROT = { S: 'RWED', O: 'RWED', G: 'RE', W: '' };
export const DEFAULT_DIR_PROT = { S: 'RWE', O: 'RWE', G: 'RE', W: 'E' };

const NAME_RE = /^[A-Z0-9$_-]{0,39}$/;
const WILD_NAME_RE = /^[A-Z0-9$_\-*%]{0,39}$/;

/** The empty disk: just the top-level directory. */
export function emptyDisk() {
	return { dirs: { '': { created: Date.now(), prot: { ...DEFAULT_DIR_PROT }, files: {} } } };
}

export const isWild = (s) => /[*%]/.test(s);
export const parentKey = (key) => (key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : '');
export const lastSeg = (key) => key.slice(key.lastIndexOf('.') + 1);
export const dirString = (key) => `[${key || '000000'}]`;
export const blocks = (text) => Math.ceil(new TextEncoder().encode(text).length / BLOCK);

/** "DISK$USER:[DEMO]NOTES.TXT;3" */
export const fullName = (dir, name, type, v) => `${DEVICE}:${dirString(dir)}${name}.${type}${v === undefined ? '' : `;${v}`}`;

/** A wildcard name or type (*, %) as a regular expression. */
export function wildRe(pattern) {
	const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.');
	return new RegExp(`^${body}$`);
}

/**
 * Split a file specification into its parts, without resolving anything.
 * "WORK:[.SUB]A.TXT;2" → { device: 'WORK', dir: '.SUB', name: 'A', type: 'TXT', version: { kind: 'num', n: 2 } }
 * Missing parts are null. Returns { error } for text that isn't a file spec.
 * @param {string} input
 */
export function parseSpec(input) {
	let s = input.trim().toUpperCase();
	/** @type {{ device: string|null, dir: string|null, name: string|null, type: string|null, version: any }} */
	const out = { device: null, dir: null, name: null, type: null, version: null };

	const dev = s.match(/^([A-Z0-9$_-]+):/);
	if (dev) {
		out.device = dev[1];
		s = s.slice(dev[0].length);
	}
	const dir = s.match(/^[[<]([^\]>]*)[\]>]/);
	if (dir) {
		out.dir = dir[1];
		s = s.slice(dir[0].length);
	} else if (/[[<\]>]/.test(s)) {
		return { error: 'DIR' };
	}

	const semi = s.search(/[;]/);
	let rest = s;
	if (semi >= 0) {
		const v = s.slice(semi + 1);
		rest = s.slice(0, semi);
		if (v === '' || v === '0') out.version = { kind: 'latest' };
		else if (v === '*') out.version = { kind: 'wild' };
		else if (/^-\d+$/.test(v)) out.version = { kind: 'rel', n: -Number(v) };
		else if (/^\d+$/.test(v) && Number(v) <= MAX_VERSION) out.version = { kind: 'num', n: Number(v) };
		else return { error: 'VER' };
	}

	const dot = rest.indexOf('.');
	const name = dot >= 0 ? rest.slice(0, dot) : rest;
	const type = dot >= 0 ? rest.slice(dot + 1) : null;
	if (!WILD_NAME_RE.test(name) || (type !== null && !WILD_NAME_RE.test(type))) return { error: 'SYN' };
	out.name = name === '' ? null : name;
	// "A." is an explicit empty type; "A" leaves the type to the command's default.
	out.type = type;
	return out;
}

/**
 * Resolve the text between the brackets against the default directory.
 * Returns { segs } for a plain directory, or { pattern } (a RegExp over '.'+key) for wildcards.
 * @param {string|null} dir @param {string} base
 */
export function resolveDir(dir, base) {
	const baseSegs = base ? base.split('.') : [];
	if (dir === null || dir === '') return { segs: baseSegs };

	let segs;
	let rest;
	if (dir[0] === '-' || dir[0] === '.') {
		let i = 0;
		let up = 0;
		for (;;) {
			if (dir[i] === '-') {
				up++;
				i++;
			} else if (dir[i] === '.' && dir[i + 1] === '-') i++;
			else break;
		}
		if (up > baseSegs.length) return { error: 'DIR' };
		segs = baseSegs.slice(0, baseSegs.length - up);
		rest = dir.slice(i);
		if (rest.startsWith('.') && !rest.startsWith('...')) rest = rest.slice(1);
	} else {
		segs = [];
		rest = dir.replace(/^000000(\.(?!\.\.)|$)/, '');
	}

	const parts = rest.split(/(\.\.\.)|\./).filter((p) => p !== undefined && p !== '');
	for (const p of parts) if (p !== '...' && (!WILD_NAME_RE.test(p) || p.length === 0)) return { error: 'DIR' };
	const wild = parts.some((p) => p === '...' || isWild(p));
	if (!wild) return { segs: [...segs, ...parts] };

	let re = segs.map((s) => `\\.${s.replace(/\$/g, '\\$')}`).join('');
	for (const p of parts) re += p === '...' ? '(?:\\.[A-Z0-9$_-]+)*' : `\\.${wildRe(p).source.slice(1, -1)}`;
	return { pattern: new RegExp(`^${re}$`) };
}

export class Disk {
	/** @param {any} state */
	constructor(state) {
		this.state = state ?? emptyDisk();
	}

	toJSON() {
		return this.state;
	}

	dir(key) {
		return this.state.dirs[key];
	}

	hasDir(key) {
		return key in this.state.dirs;
	}

	/** Directory keys matching a resolved directory, sorted. */
	matchDirs(resolved) {
		if (resolved.segs) {
			const key = resolved.segs.join('.');
			return this.hasDir(key) ? [key] : [];
		}
		return Object.keys(this.state.dirs)
			.filter((k) => resolved.pattern.test(k ? `.${k}` : ''))
			.sort();
	}

	subdirs(key) {
		return Object.keys(this.state.dirs)
			.filter((k) => k !== '' && parentKey(k) === key)
			.sort();
	}

	/**
	 * Every entry in a directory, as the DIRECTORY command lists them: alphabetical by name.type,
	 * newest version first. Subdirectories appear as NAME.DIR;1.
	 */
	entries(key) {
		const d = this.dir(key);
		if (!d) return [];
		const out = [];
		for (const [nt, versions] of Object.entries(d.files)) {
			const [name, type] = splitNT(nt);
			for (const rec of versions) out.push({ dir: key, name, type, v: rec.v, rec, isDir: false });
		}
		for (const sub of this.subdirs(key)) {
			const sd = this.dir(sub);
			out.push({ dir: key, name: lastSeg(sub), type: 'DIR', v: 1, rec: { v: 1, text: '', created: sd.created, modified: sd.created, prot: sd.prot, size: 1 }, isDir: true, key: sub });
		}
		out.sort((a, b) => {
			const an = `${a.name}.${a.type}`;
			const bn = `${b.name}.${b.type}`;
			return an < bn ? -1 : an > bn ? 1 : b.v - a.v;
		});
		return out;
	}

	/**
	 * Files matching a name, type and version in the given directories.
	 * @param {string[]} dirs @param {string} name @param {string} type
	 * @param {{kind: string, n?: number}} version
	 */
	search(dirs, name, type, version) {
		const nre = wildRe(name);
		const tre = wildRe(type);
		const out = [];
		for (const key of dirs) {
			const all = this.entries(key).filter((e) => nre.test(e.name) && tre.test(e.type));
			const groups = new Map();
			for (const e of all) {
				const k = `${e.name}.${e.type}`;
				if (!groups.has(k)) groups.set(k, []);
				groups.get(k).push(e);
			}
			for (const list of groups.values()) {
				if (version.kind === 'wild') out.push(...list);
				else if (version.kind === 'latest') out.push(list[0]);
				else if (version.kind === 'num') out.push(...list.filter((e) => e.v === version.n));
				else if (version.kind === 'rel' && version.n !== undefined && list[version.n]) out.push(list[version.n]);
			}
		}
		return out;
	}

	/** The versions of one file, newest first, or [] if there are none. */
	versions(dir, name, type) {
		return this.dir(dir)?.files[`${name}.${type}`] ?? [];
	}

	/**
	 * Write a new version of a file and return its version number.
	 * @param {string} dir @param {string} name @param {string} type @param {string} text
	 * @param {{ v?: number, prot?: any, created?: number }} [opts]
	 */
	write(dir, name, type, text, opts = {}) {
		const d = this.dir(dir);
		const nt = `${name}.${type}`;
		const list = (d.files[nt] ??= []);
		const top = list.length ? list[0].v : 0;
		const v = opts.v ?? top + 1;
		if (v > MAX_VERSION) throw new Error('VERLIM');
		if (list.some((r) => r.v === v)) throw new Error('FEX');
		const now = Date.now();
		list.push({ v, text, created: opts.created ?? now, modified: now, prot: { ...(opts.prot ?? DEFAULT_FILE_PROT) } });
		list.sort((a, b) => b.v - a.v);
		return v;
	}

	remove(dir, name, type, v) {
		const d = this.dir(dir);
		const nt = `${name}.${type}`;
		d.files[nt] = (d.files[nt] ?? []).filter((r) => r.v !== v);
		if (!d.files[nt].length) delete d.files[nt];
	}

	mkdir(key) {
		this.state.dirs[key] = { created: Date.now(), prot: { ...DEFAULT_DIR_PROT }, files: {} };
	}

	isEmptyDir(key) {
		return Object.keys(this.dir(key).files).length === 0 && this.subdirs(key).length === 0;
	}

	rmdir(key) {
		delete this.state.dirs[key];
	}
}

/** "NOTES.TXT" → ['NOTES', 'TXT'] */
export function splitNT(nt) {
	const i = nt.indexOf('.');
	return [nt.slice(0, i), nt.slice(i + 1)];
}

/** {S:'RWED',O:'RWED',G:'RE',W:''} → "(S:RWED,O:RWED,G:RE,W)" */
export function protString(p) {
	return `(${['S', 'O', 'G', 'W'].map((k) => (p[k] ? `${k}:${p[k]}` : k)).join(',')})`;
}

/**
 * Apply a protection code like "(O:RWED,W:R)" to an existing protection.
 * Categories that aren't named keep their access. Returns null if the code isn't valid.
 */
export function applyProt(code, prot) {
	const body = code.replace(/^\(|\)$/g, '').toUpperCase();
	const out = { ...prot };
	if (!body.trim()) return null;
	for (const part of body.split(',')) {
		const m = part.trim().match(/^(S|SYSTEM|O|OWNER|G|GROUP|W|WORLD)(?:[:=]([RWED]*))?$/);
		if (!m) return null;
		const k = m[1][0];
		out[k] = ['R', 'W', 'E', 'D'].filter((c) => (m[2] ?? '').includes(c)).join('');
	}
	return out;
}

export { NAME_RE };
