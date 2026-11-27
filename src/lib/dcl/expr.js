// DCL values and expressions: the right-hand side of X = ..., IF conditions and WRITE.
// A value is { t: 's', v: string } or { t: 'i', v: number } (a 32-bit integer).

export class DclError extends Error {
	/** @param {string} message  a full "%FAC-S-IDENT, text" line @param {number} [status] */
	constructor(message, status = 0x00038000) {
		super(message);
		this.status = status;
	}
}

export const str = (v) => ({ t: 's', v: String(v) });
export const int = (v) => ({ t: 'i', v: v | 0 });

/** DCL's string-to-integer rule: a number if it looks like one, else true for T or Y. */
export function toInt(val) {
	if (val.t === 'i') return val.v;
	const s = val.v.trim();
	if (/^[+-]?\d+$/.test(s)) return Number(s) | 0;
	if (/^%X[0-9A-F]+$/i.test(s)) return parseInt(s.slice(2), 16) | 0;
	return /^[TY]/i.test(s) ? 1 : 0;
}

export const toStr = (val) => (val.t === 's' ? val.v : String(val.v));
export const truthy = (val) => (toInt(val) & 1) === 1;

const OPS = {
	'.OR.': 1, '.AND.': 2, '.NOT.': 3,
	'.EQ.': 4, '.NE.': 4, '.LT.': 4, '.LE.': 4, '.GT.': 4, '.GE.': 4,
	'.EQS.': 4, '.NES.': 4, '.LTS.': 4, '.LES.': 4, '.GTS.': 4, '.GES.': 4,
	'+': 5, '-': 5, '*': 6, '/': 6
};

const undsym = (name) => new DclError(`%DCL-W-UNDSYM, undefined symbol - check validity and spelling\n \\${name}\\`, 0x00038140);
const ivexpr = (text) => new DclError(`%DCL-W-IVEXPR, invalid expression syntax - check use of the operators\n \\${text}\\`, 0x00038048);

/** Split an expression into tokens. */
function tokenize(src) {
	const toks = [];
	let i = 0;
	while (i < src.length) {
		const c = src[i];
		if (/\s/.test(c)) {
			i++;
		} else if (c === '"') {
			let s = '';
			i++;
			for (;;) {
				if (i >= src.length) throw new DclError('%DCL-W-UNDELIMSTR, unterminated string - supply missing quotation mark', 0x00038038);
				if (src[i] === '"') {
					if (src[i + 1] === '"') {
						s += '"';
						i += 2;
						continue;
					}
					i++;
					break;
				}
				s += src[i++];
			}
			toks.push({ k: 'val', val: str(s) });
		} else if (/\d/.test(c)) {
			const m = src.slice(i).match(/^\d+/);
			toks.push({ k: 'val', val: int(Number(m[0])) });
			i += m[0].length;
		} else if (c === '%' && /^%X[0-9A-F]+/i.test(src.slice(i))) {
			const m = src.slice(i).match(/^%X([0-9A-F]+)/i);
			toks.push({ k: 'val', val: int(parseInt(m[1], 16)) });
			i += m[0].length;
		} else if (c === '.') {
			const m = src.slice(i).match(/^\.[A-Z]+\./i);
			if (!m || !(m[0].toUpperCase() in OPS)) throw ivexpr(src.slice(i));
			toks.push({ k: 'op', op: m[0].toUpperCase() });
			i += m[0].length;
		} else if ('+-*/'.includes(c)) {
			toks.push({ k: 'op', op: c });
			i++;
		} else if (c === '(' || c === ')' || c === ',') {
			toks.push({ k: c });
			i++;
		} else if (/[A-Z$_]/i.test(c)) {
			const m = src.slice(i).match(/^[A-Z0-9$_]+/i);
			toks.push({ k: 'name', name: m[0].toUpperCase() });
			i += m[0].length;
		} else {
			throw ivexpr(src.slice(i));
		}
	}
	return toks;
}

/**
 * Evaluate a DCL expression.
 * @param {string} src
 * @param {{ lookup: (name: string) => any, lexical: (name: string, args: any[]) => any }} ctx
 */
export function evaluate(src, ctx) {
	const toks = tokenize(src);
	if (!toks.length) return str('');
	let pos = 0;
	const peek = () => toks[pos];

	function primary() {
		const t = toks[pos++];
		if (!t) throw ivexpr(src);
		if (t.k === 'val') return t.val;
		if (t.k === '(') {
			const v = expr(0);
			if (toks[pos++]?.k !== ')') throw ivexpr(src);
			return v;
		}
		if (t.k === 'op' && (t.op === '-' || t.op === '+')) {
			const v = toInt(unary());
			return int(t.op === '-' ? -v : v);
		}
		if (t.k === 'op' && t.op === '.NOT.') return int(~toInt(expr(3)));
		if (t.k === 'name') {
			if (t.name.startsWith('F$') && peek()?.k === '(') {
				pos++;
				// F$TYPE(X) asks about the symbol X itself, so an undefined X isn't an error.
				if (t.name === 'F$TYPE' && toks[pos]?.k === 'name' && toks[pos + 1]?.k === ')') {
					const v = ctx.lookup(toks[pos].name);
					pos += 2;
					return ctx.lexical(t.name, [v ?? null]);
				}
				const args = [];
				if (peek()?.k === ')') pos++;
				else {
					for (;;) {
						// Empty arguments are allowed: F$PARSE(spec,,,"NAME")
						if (peek()?.k === ',' || peek()?.k === ')') args.push(null);
						else args.push(expr(0));
						const sep = toks[pos++];
						if (sep?.k === ')') break;
						if (sep?.k !== ',') throw ivexpr(src);
					}
				}
				return ctx.lexical(t.name, args);
			}
			const v = ctx.lookup(t.name);
			if (v === undefined) throw undsym(t.name);
			return v;
		}
		throw ivexpr(src);
	}

	function unary() {
		return primary();
	}

	function expr(minPrec) {
		let left = primary();
		for (;;) {
			const t = peek();
			if (!t || t.k !== 'op' || t.op === '.NOT.') break;
			const prec = OPS[t.op];
			if (prec <= minPrec) break;
			pos++;
			const right = expr(prec);
			left = binary(t.op, left, right);
		}
		return left;
	}

	const v = expr(0);
	if (pos < toks.length) throw ivexpr(src);
	return v;
}

function binary(op, a, b) {
	const both = a.t === 's' && b.t === 's';
	switch (op) {
		case '+':
			return both ? str(a.v + b.v) : int(toInt(a) + toInt(b));
		case '-': {
			if (!both) return int(toInt(a) - toInt(b));
			const i = a.v.indexOf(b.v);
			return str(i < 0 || b.v === '' ? a.v : a.v.slice(0, i) + a.v.slice(i + b.v.length));
		}
		case '*':
			return int(Math.imul(toInt(a), toInt(b)));
		case '/': {
			const d = toInt(b);
			if (d === 0) throw new DclError('%SYSTEM-F-INTDIV, arithmetic trap, integer divide by zero', 0x0000047c);
			return int(Math.trunc(toInt(a) / d));
		}
		case '.AND.':
			return int(toInt(a) & toInt(b));
		case '.OR.':
			return int(toInt(a) | toInt(b));
	}
	if (op.endsWith('S.')) {
		const x = toStr(a);
		const y = toStr(b);
		const r = { '.EQS.': x === y, '.NES.': x !== y, '.LTS.': x < y, '.LES.': x <= y, '.GTS.': x > y, '.GES.': x >= y }[op];
		return int(r ? 1 : 0);
	}
	const x = toInt(a);
	const y = toInt(b);
	const r = { '.EQ.': x === y, '.NE.': x !== y, '.LT.': x < y, '.LE.': x <= y, '.GT.': x > y, '.GE.': x >= y }[op];
	return int(r ? 1 : 0);
}
