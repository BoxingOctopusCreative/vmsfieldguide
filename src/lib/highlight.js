// Tiny syntax highlighter for DCL and POSIX shell commands.
// Returns HTML: the input is escaped, then wrapped in <span class="hl-…"> tokens.
// It's a line-by-line scanner tuned for the short commands on this site, not a full parser.
//
// Token classes: hl-cmd (command/verb), hl-flag (qualifier or option), hl-str (string),
// hl-path (file spec, device, path), hl-var (symbol, logical, variable, lexical),
// hl-num (number), hl-op (operator/punctuation), hl-com (comment or prompt).

/** @param {string} s */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @param {string} cls @param {string} text */
const tok = (cls, text) => (cls ? `<span class="hl-${cls}">${esc(text)}</span>` : esc(text));

/**
 * Run a list of [regex, handler] rules over one line. Each regex must be sticky (/y).
 * A handler returns the token class (or '' for plain text).
 * @param {string} line
 * @param {Array<[RegExp, (m: RegExpExecArray, at: number) => string]>} rules
 */
function scan(line, rules) {
	let out = '';
	let i = 0;
	outer: while (i < line.length) {
		for (const [re, cls] of rules) {
			re.lastIndex = i;
			const m = re.exec(line);
			if (m && m[0].length) {
				out += tok(cls(m, i), m[0]);
				i += m[0].length;
				continue outer;
			}
		}
		out += esc(line[i++]);
	}
	return out;
}

/* ---------------- DCL ---------------- */

// Verbs whose next word is part of the command ("SHOW SYSTEM", "SET DEFAULT").
const DCL_TWO_WORD = new Set(['SHOW', 'SET', 'TCPIP', 'PRODUCT', 'MONITOR']);
// Words after which a new command starts.
const DCL_PREFIX = new Set(['PIPE', 'THEN', 'ELSE', 'MC', 'MCR', 'RUN', 'SPAWN']);
const DCL_KEYWORDS = new Set(['IF', 'THEN', 'ELSE', 'ENDIF', 'ON', 'ERROR', 'WARNING', 'GOTO', 'EXIT', 'PIPE']);

/** @param {string} line @param {boolean} continued */
function dclLine(line, continued) {
	let expectCmd = !continued; // next word is a verb
	let secondWord = false; // next word completes a two-word verb
	return scan(line, [
		[/^\$(?=\s|$)/y, () => 'com'], // "$ " prompt
		[/\s+/y, () => ''],
		[/!.*/y, () => 'com'],
		[/"(?:[^"]|"")*"?/y, () => ((expectCmd = false), 'str')],
		[/''?[A-Za-z_$][\w$]*'/y, () => 'var'], // 'SYM' and ''SYM' substitution
		[/\/[A-Za-z_][\w$]*/y, () => ((expectCmd = false), (secondWord = false), 'flag')], // /QUALIFIER
		[/\.(?:EQS|NES|LTS|GTS|LES|GES|EQ|NE|LT|GT|LE|GE|AND|OR|NOT)\./iy, () => 'op'],
		[/\[[^\]\s]*\]/y, () => ((expectCmd = false), 'path')], // [DIR.SUB], [-], [...]
		[/F\$[A-Z]+(?=\()/iy, () => 'var'], // lexical function
		// device or logical followed by a colon: DKA0:, SYS$LOGIN:, X86923::
		[/[A-Za-z_][\w$]*(?=::?)/y, (m) => (/[$\d]/.test(m[0]) ? ((expectCmd = false), m[0].includes('$') ? 'var' : 'path') : '')],
		[/:==?/y, () => ((expectCmd = true), 'op')], // LL :== DIRECTORY/SIZE (a command follows)
		[/==?/y, () => ((expectCmd = false), (secondWord = false), 'op')], // assignment or /QUAL=value
		[/[|>]/y, (m) => ((expectCmd = m[0] === '|'), 'op')],
		[/@/y, () => 'op'],
		[/-$/y, () => 'op'], // line continuation
		[/\d+(?![\w.$;])/y, () => 'num'],
		[
			/[\w$.;*%-]+/y,
			(m) => {
				const w = m[0];
				const up = w.toUpperCase();
				// NAME = value / NAME :== value: the first word is a symbol, not a verb.
				if (expectCmd && /^\s*:?==?/.test(line.slice(m.index + w.length))) return (expectCmd = false), 'var';
				if (expectCmd || secondWord) {
					secondWord = expectCmd && DCL_TWO_WORD.has(up);
					expectCmd = DCL_PREFIX.has(up);
					return 'cmd';
				}
				if (DCL_KEYWORDS.has(up)) {
					expectCmd = DCL_PREFIX.has(up);
					return 'cmd';
				}
				if (/[.;*%]/.test(w)) return 'path';
				if (w.includes('$')) return 'var';
				return '';
			}
		]
	]);
}

/** @param {string} code */
export function highlightDcl(code) {
	const lines = code.split('\n');
	return lines.map((l, i) => dclLine(l, i > 0 && /-\s*$/.test(lines[i - 1]))).join('\n');
}

/* ---------------- Shell ---------------- */

// Words after which the next word is still a command.
const SH_PREFIX = new Set(['sudo', 'export', 'exec', 'nohup', 'time', 'env', 'xargs', 'then', 'do', 'else']);

/** @param {string} line @param {boolean} continued */
function shLine(line, continued) {
	let expectCmd = !continued;
	let assignValue = false; // the word after VAR= is its value, not a command
	return scan(line, [
		[/\s+/y, () => ''],
		[/#.*/y, (m, at) => (at === 0 || /\s/.test(line[at - 1]) ? 'com' : '')],
		[/'[^']*'?/y, () => ((expectCmd = false), 'str')],
		[/"(?:[^"\\]|\\.)*"?/y, () => ((expectCmd = false), 'str')],
		[/\$\(/y, () => ((expectCmd = true), 'var')],
		[/\$\{[^}]*\}|\$[A-Za-z_]\w*|\$[$?#@*0-9!]/y, () => ((expectCmd = false), 'var')],
		[/\|\||&&|[|;&]|[0-9]?>>?(?:&[0-9])?|</y, (m) => ((expectCmd = /^(\|\|?|&&|;|&)$/.test(m[0])), 'op')],
		[/[()]/y, () => 'op'],
		[/\\$/y, () => 'op'], // line continuation
		[/--?[\w-]+(?:=\S*)?|-(?=\s|$)/y, (m, at) => (at === 0 || /\s/.test(line[at - 1]) ? ((expectCmd = false), 'flag') : '')],
		[/[A-Za-z_]\w*=(?=\S)/y, () => (expectCmd ? ((assignValue = true), 'var') : '')], // VAR=value before a command
		[/\d+(?![\w./:-])/y, () => ((expectCmd = false), 'num')],
		[
			/[^\s'"|;&<>()$]+/y,
			(m) => {
				const w = m[0];
				if (assignValue) {
					assignValue = false;
					return /[/~]/.test(w) ? 'path' : '';
				}
				if (expectCmd) {
					expectCmd = SH_PREFIX.has(w);
					return 'cmd';
				}
				if (/[/~]|^\.|\.\w+$/.test(w)) return 'path';
				return '';
			}
		]
	]);
}

/** @param {string} code */
export function highlightShell(code) {
	const lines = code.split('\n');
	return lines.map((l, i) => shLine(l, i > 0 && /\\\s*$/.test(lines[i - 1]))).join('\n');
}

/**
 * @param {string} code
 * @param {string} lang 'dcl' for DCL; anything else is treated as shell
 */
export function highlight(code, lang) {
	return lang === 'dcl' ? highlightDcl(code) : highlightShell(code);
}
