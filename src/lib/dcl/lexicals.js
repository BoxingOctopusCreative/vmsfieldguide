// Lexical functions: F$TIME(), F$LENGTH(), F$SEARCH() and friends.

import { DclError, str, int, toStr, toInt } from './expr.js';
import { DEVICE, dirString, fullName, blocks, protString } from './fs.js';
import { vmsTime, comparisonTime, parseVmsTime, MONTHS } from './time.js';
import { USER, NODE, VERSION } from './system.js';

const insfarg = () => new DclError('%DCL-W-INSFARG, insufficient arguments - supply all required arguments', 0x00038150);
const ivkeyw = (k) => new DclError(`%DCL-W-IVKEYW, unrecognized keyword - check validity and spelling\n \\${k}\\`, 0x00038060);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Protection as F$FILE_ATTRIBUTES and SHOW PROTECTION write it. */
export function protWords(p) {
	const w = (s) => s || 'NO ACCESS';
	return `SYSTEM=${w(p.S)}, OWNER=${w(p.O)}, GROUP=${w(p.G)}, WORLD=${w(p.W)}`;
}

/**
 * @param {import('./shell.js').Shell} sh @param {string} name @param {any[]} args
 */
export function lexical(sh, name, args) {
	const s = (i, required = true) => {
		if (args[i] === undefined || args[i] === null) {
			if (required) throw insfarg();
			return '';
		}
		return toStr(args[i]);
	};
	const n = (i) => {
		if (args[i] === undefined || args[i] === null) throw insfarg();
		return toInt(args[i]);
	};

	switch (name) {
		case 'F$TIME':
			return str(vmsTime());
		case 'F$LENGTH':
			return int(s(0).length);
		case 'F$EXTRACT': {
			const start = n(0);
			const len = n(1);
			return str(s(2).substr(Math.max(0, start), Math.max(0, len)));
		}
		case 'F$LOCATE': {
			const i = s(1).indexOf(s(0));
			return int(i < 0 ? s(1).length : i);
		}
		case 'F$ELEMENT': {
			const parts = s(2).split(s(1));
			const i = n(0);
			return str(i >= 0 && i < parts.length ? parts[i] : s(1));
		}
		case 'F$EDIT': {
			let v = s(0);
			for (const e of s(1).toUpperCase().split(',').map((x) => x.trim())) {
				if (e === 'COLLAPSE') v = v.replace(/[ \t]/g, '');
				else if (e === 'COMPRESS') v = v.replace(/[ \t]+/g, ' ');
				else if (e === 'TRIM') v = v.trim();
				else if (e === 'UPCASE') v = v.toUpperCase();
				else if (e === 'LOWERCASE') v = v.toLowerCase();
				else if (e === 'UNCOMMENT') v = v.replace(/!.*$/, '');
				else throw ivkeyw(e);
			}
			return str(v);
		}
		case 'F$STRING':
			if (!args[0]) throw insfarg();
			return str(toStr(args[0]));
		case 'F$INTEGER':
			if (!args[0]) throw insfarg();
			return int(toInt(args[0]));
		case 'F$TYPE': {
			// F$TYPE takes a symbol name, not its value, so read it back from the argument text.
			const v = args[0];
			return str(!v ? '' : v.t === 'i' ? 'INTEGER' : 'STRING');
		}
		case 'F$MODE':
			return str('INTERACTIVE');
		case 'F$DIRECTORY':
			return str(dirString(sh.defaultDir));
		case 'F$USER':
			return str(`[${USER}]`);
		case 'F$TRNLNM': {
			const table = args[1] ? s(1).toUpperCase().replace(/^LNM\$/, '').replace(/_TABLE$/, '') : '';
			const v = table ? sh.logical(s(0), [table].filter((t) => t in sh.lnm)) : sh.logical(s(0));
			return str(v ? v.value : '');
		}
		case 'F$ENVIRONMENT': {
			const item = s(0).toUpperCase();
			const map = {
				DEFAULT: `${DEVICE}:${dirString(sh.defaultDir)}`,
				PROCEDURE: sh.frame.proc?.file ?? '',
				DEPTH: sh.depth,
				PROMPT: sh.prompt,
				VERIFY_PROCEDURE: sh.verify ? 'TRUE' : 'FALSE',
				VERIFY_IMAGE: 'FALSE',
				INTERACTIVE: 'TRUE',
				ON_SEVERITY: ['WARNING', '', 'ERROR', '', 'SEVERE_ERROR'][sh.frame.on.level],
				MAX_DEPTH: 32
			};
			if (!(item in map)) throw ivkeyw(item);
			const v = map[item];
			return typeof v === 'number' ? int(v) : str(v);
		}
		case 'F$GETSYI': {
			const item = s(0).toUpperCase();
			const map = {
				NODENAME: NODE,
				VERSION,
				HW_NAME: 'x86_64 Virtual Machine',
				ARCH_NAME: 'x86_64',
				ARCH_TYPE: 4,
				ACTIVECPU_CNT: 1,
				AVAILCPU_CNT: 1,
				BOOTTIME: vmsTime(sh.loginTime - 3 * 86400000 - 4 * 3600000),
				CLUSTER_MEMBER: 'FALSE',
				MEMSIZE: 1048576,
				PAGE_SIZE: 8192
			};
			if (!(item in map)) throw ivkeyw(item);
			const v = map[item];
			return typeof v === 'number' ? int(v) : str(v);
		}
		case 'F$GETJPI': {
			const item = s(1).toUpperCase();
			const map = {
				USERNAME: USER.padEnd(12),
				PID: '00000421',
				PRCNAM: USER,
				TERMINAL: 'FTA1:',
				UIC: `[${USER}]`,
				MODE: 'INTERACTIVE',
				NODENAME: NODE,
				PRIB: 4,
				LOGINTIM: vmsTime(sh.loginTime)
			};
			if (!(item in map)) throw ivkeyw(item);
			const v = map[item];
			return typeof v === 'number' ? int(v) : str(v);
		}
		case 'F$CVTIME': {
			const input = args[0] ? s(0) : '';
			const ms = input ? parseVmsTime(input) : Date.now();
			if (ms === null) throw new DclError('%SYSTEM-F-IVTIME, invalid time', 0x00000184);
			const d = new Date(ms);
			const fmt = args[1] ? s(1).toUpperCase() : 'COMPARISON';
			const field = args[2] ? s(2).toUpperCase() : 'DATETIME';
			const c = comparisonTime(ms);
			const two = (x) => String(x).padStart(2, '0');
			const abs = fmt === 'ABSOLUTE';
			const fields = {
				DATETIME: abs ? vmsTime(ms).trim() : c,
				DATE: abs ? vmsTime(ms).trim().split(' ')[0] : c.split(' ')[0],
				TIME: c.split(' ')[1],
				YEAR: String(d.getFullYear()),
				MONTH: abs ? MONTHS[d.getMonth()] : two(d.getMonth() + 1),
				DAY: two(d.getDate()),
				HOUR: two(d.getHours()),
				MINUTE: two(d.getMinutes()),
				SECOND: two(d.getSeconds()),
				WEEKDAY: WEEKDAYS[d.getDay()]
			};
			if (!(field in fields)) throw ivkeyw(field);
			return str(fields[field]);
		}
		case 'F$MESSAGE': {
			const code = n(0);
			if (code === 1) return str('%SYSTEM-S-NORMAL, normal successful completion');
			return str(`%NONAME-${'WSEIF'[code & 7]}-NOMSG, Message number ${(code >>> 0).toString(16).toUpperCase().padStart(8, '0')}`);
		}
		case 'F$SEARCH': {
			const spec = s(0).toUpperCase();
			const ctx = sh.searchContext;
			if (ctx.spec !== spec) {
				const res = sh.resolve(spec, { name: '*', type: '*' });
				const found = res.error ? [] : sh.find(res).filter((e) => !e.isDir || res.type === 'DIR' || res.type === '*');
				sh.searchContext = { spec, results: found.map((e) => fullName(e.dir, e.name, e.type, e.v)), i: 0, wild: res.wild };
			}
			const c = sh.searchContext;
			if (!c.wild) return str(c.results[0] ?? '');
			if (c.i >= c.results.length) {
				sh.searchContext = { spec: '', results: [], i: 0 };
				return str('');
			}
			return str(c.results[c.i++]);
		}
		case 'F$PARSE': {
			const spec = s(0);
			const def = args[1] ? s(1) : '';
			const field = args[3] ? s(3).toUpperCase() : '';
			const syntaxOnly = args[4] && s(4).toUpperCase() === 'SYNTAX_ONLY';
			const d = def ? sh.resolve(def) : null;
			const res = sh.resolve(spec, { name: d?.hasName ? d.name : '', type: d?.hasName ? d.type : '' });
			if (res.error) return str('');
			if (!syntaxOnly && !res.wildDir && !sh.disk.hasDir(res.dirKey)) return str('');
			const dir = res.wildDir ? res.display.match(/\[.*\]/)[0] : dirString(res.dirKey);
			const ver = res.version?.kind === 'num' ? `;${res.version.n}` : res.version?.kind === 'wild' ? ';*' : ';';
			const parts = { NODE: '', DEVICE: `${DEVICE}:`, DIRECTORY: dir, NAME: res.name, TYPE: `.${res.type}`, VERSION: ver };
			if (field) {
				if (!(field in parts)) throw ivkeyw(field);
				return str(parts[field]);
			}
			return str(parts.DEVICE + parts.DIRECTORY + parts.NAME + parts.TYPE + parts.VERSION);
		}
		case 'F$FILE_ATTRIBUTES': {
			const res = sh.resolve(s(0));
			const item = s(1).toUpperCase();
			const found = res.error ? [] : sh.find(res);
			if (!found.length) throw new DclError('%SYSTEM-W-NOSUCHFILE, no such file', 0x00000910);
			const e = found[0];
			const used = e.isDir ? 1 : blocks(e.rec.text);
			const longest = Math.max(0, ...e.rec.text.split('\n').map((l) => l.length));
			const map = {
				EOF: used,
				ALQ: used ? Math.ceil(used / 16) * 16 : 0,
				CDT: vmsTime(e.rec.created).trim(),
				RDT: vmsTime(e.rec.modified).trim(),
				PRO: protWords(e.rec.prot),
				UIC: `[${USER}]`,
				DIRECTORY: e.isDir ? 'TRUE' : 'FALSE',
				ORG: 'SEQ',
				RFM: 'VAR',
				MRS: 0,
				LRL: longest,
				FILEID: `(${1000 + e.v},1,0)`
			};
			if (!(item in map)) throw ivkeyw(item);
			const v = map[item];
			return typeof v === 'number' ? int(v) : str(v);
		}
	}
	throw new DclError(`%DCL-W-IVKEYW, unrecognized keyword - check validity and spelling\n \\${name}\\`, 0x00038060);
}

export { protString };
