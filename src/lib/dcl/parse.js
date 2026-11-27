// Turning a DCL command line into a verb, parameters and qualifiers.

/** Drop a "!" comment, ignoring any "!" inside quotes. */
export function stripComment(line) {
	let q = false;
	for (let i = 0; i < line.length; i++) {
		if (line[i] === '"') q = !q;
		else if (line[i] === '!' && !q) return line.slice(0, i);
	}
	return line;
}

const SYM_RE = /^[A-Z$_][A-Z0-9$_]*$/i;

/**
 * Apostrophe substitution: 'X' outside quotes, ''X' inside them, becomes the value of symbol X.
 * An undefined symbol becomes the empty string, as on a real system.
 * @param {string} line @param {(name: string) => string | undefined} value
 */
export function substitute(line, value) {
	let out = '';
	let q = false;
	let i = 0;
	while (i < line.length) {
		const c = line[i];
		if (c === '"') {
			if (q && line[i + 1] === '"') {
				out += '""';
				i += 2;
				continue;
			}
			q = !q;
			out += c;
			i++;
			continue;
		}
		if (c === "'") {
			const start = q ? (line[i + 1] === "'" ? i + 2 : -1) : i + 1;
			if (start > 0) {
				const end = line.indexOf("'", start);
				const name = end > 0 ? line.slice(start, end) : '';
				if (SYM_RE.test(name)) {
					out += value(name.toUpperCase()) ?? '';
					i = end + 1;
					continue;
				}
			}
		}
		out += c;
		i++;
	}
	return out;
}

/** Read a quoted string starting at s[i] === '"'. Returns [text, nextIndex]. */
function readQuoted(s, i) {
	let t = '';
	i++;
	while (i < s.length) {
		if (s[i] === '"') {
			if (s[i + 1] === '"') {
				t += '"';
				i += 2;
				continue;
			}
			return [t, i + 1];
		}
		t += s[i++];
	}
	return [t, i];
}

/** Read a parenthesised group starting at s[i] === '('. Returns [text including parens, nextIndex]. */
function readParens(s, i) {
	let depth = 0;
	let t = '';
	while (i < s.length) {
		const c = s[i];
		if (c === '"') {
			const [q, j] = readQuoted(s, i);
			t += `"${q}"`;
			i = j;
			continue;
		}
		if (c === '(') depth++;
		if (c === ')') depth--;
		t += c.toUpperCase();
		i++;
		if (depth === 0) break;
	}
	return [t, i];
}

/** Split "a,b,(c,d)" at top-level commas. */
export function splitTop(s, sep = ',') {
	const out = [];
	let cur = '';
	let depth = 0;
	let q = false;
	for (const c of s) {
		if (c === '"') q = !q;
		if (!q && c === '(') depth++;
		if (!q && c === ')') depth--;
		if (!q && depth === 0 && c === sep) {
			out.push(cur);
			cur = '';
		} else cur += c;
	}
	out.push(cur);
	return out;
}

/**
 * Parameters and qualifiers from the rest of a command line.
 * Unquoted text is upper-cased; quoted text keeps its case and spaces.
 * Each parameter is a list, because DCL parameters can be comma lists: DELETE A.TXT;1,B.TXT;1
 * @param {string} s
 * @returns {{ params: string[][], quals: Array<{ name: string, value: string|null, quoted: boolean }>, quoted: boolean[][] }}
 */
export function parseArgs(s) {
	/** @type {string[][]} */
	const params = [];
	/** @type {boolean[][]} */
	const quoted = [];
	const quals = [];
	let cur = null;
	let curQ = null;
	let item = '';
	let has = false;
	let wasQuoted = false;
	let afterComma = false;

	const flushItem = () => {
		if (has) {
			(cur ??= []).push(item);
			(curQ ??= []).push(wasQuoted);
		}
		item = '';
		has = false;
		wasQuoted = false;
	};
	const flushParam = () => {
		flushItem();
		if (cur) {
			params.push(cur);
			quoted.push(curQ);
		}
		cur = null;
		curQ = null;
	};

	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/\s/.test(c)) {
			while (i < s.length && /\s/.test(s[i])) i++;
			if (s[i] !== ',' && !afterComma && s[i] !== '/') flushParam();
			continue;
		}
		if (c === ',') {
			flushItem();
			afterComma = true;
			i++;
			continue;
		}
		afterComma = false;
		if (c === '/') {
			flushItem();
			i++;
			const m = s.slice(i).match(/^[A-Z0-9$_]*/i);
			const name = m[0].toUpperCase();
			i += m[0].length;
			let value = null;
			let q = false;
			if (s[i] === '=' || s[i] === ':') {
				i++;
				if (s[i] === '"') {
					[value, i] = readQuoted(s, i);
					q = true;
				} else if (s[i] === '(') {
					[value, i] = readParens(s, i);
				} else {
					const v = s.slice(i).match(/^[^\s/,]*/)[0];
					value = v.toUpperCase();
					i += v.length;
				}
			}
			quals.push({ name, value, quoted: q });
			continue;
		}
		if (c === '"') {
			const [t, j] = readQuoted(s, i);
			item += t;
			has = true;
			wasQuoted = true;
			i = j;
			continue;
		}
		if (c === '(') {
			const [t, j] = readParens(s, i);
			item += t;
			has = true;
			i = j;
			continue;
		}
		item += c.toUpperCase();
		has = true;
		i++;
	}
	flushParam();
	return { params, quals, quoted };
}

/**
 * The value of a := string assignment: quoted parts kept as typed, the rest
 * upper-cased with runs of spaces squeezed to one and the ends trimmed.
 */
export function stringAssignValue(s) {
	let out = '';
	let i = 0;
	while (i < s.length) {
		if (s[i] === '"') {
			const [t, j] = readQuoted(s, i);
			out += t;
			i = j;
		} else {
			out += /\s/.test(s[i]) ? (out.endsWith(' ') ? '' : ' ') : s[i].toUpperCase();
			i++;
		}
	}
	return out.trim();
}

/** Find a keyword (like THEN) at the top level of a line, outside quotes. Returns its index or -1. */
export function findKeyword(s, word) {
	let q = false;
	const re = new RegExp(`^${word}(?![A-Z0-9$_])`, 'i');
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '"') q = !q;
		if (q) continue;
		const prev = s[i - 1];
		if ((i === 0 || /[\s)"]/.test(prev)) && re.test(s.slice(i))) return i;
	}
	return -1;
}

/**
 * Match an abbreviation against a list of names. A name matches if it starts with the abbreviation.
 * One match wins; otherwise the names whose minimum length the abbreviation meets.
 * @param {string} abbr @param {Array<{ name: string, min?: number }>} list
 * @returns {{ match?: any, ambiguous?: boolean }}
 */
export function matchAbbrev(abbr, list) {
	const exact = list.find((x) => x.name === abbr);
	if (exact) return { match: exact };
	const hits = list.filter((x) => x.name.startsWith(abbr));
	if (hits.length === 1) return { match: hits[0] };
	if (!hits.length) return {};
	const strong = hits.filter((x) => abbr.length >= (x.min ?? x.name.length));
	if (strong.length === 1) return { match: strong[0] };
	return { ambiguous: true };
}
