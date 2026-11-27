// VMS date and time formats.

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const two = (n) => String(n).padStart(2, '0');

/** " 7-NOV-2026 09:05:03.12" (hundredths optional). The day is padded with a space, as F$TIME does. */
export function vmsTime(ms = Date.now(), hundredths = true) {
	const d = new Date(ms);
	const base = `${String(d.getDate()).padStart(2, ' ')}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
	return hundredths ? `${base}.${two(Math.floor(d.getMilliseconds() / 10))}` : base;
}

/** "2026-11-27 14:03:12.34", the comparison format F$CVTIME returns. */
export function comparisonTime(ms = Date.now()) {
	const d = new Date(ms);
	return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${two(Math.floor(d.getMilliseconds() / 10))}`;
}

/**
 * Parse an absolute VMS time or a keyword: TODAY, YESTERDAY, TOMORROW, "27-NOV-2026", "27-NOV-2026:14:00" or "27-NOV-2026 14:00".
 * Returns milliseconds, or null.
 */
export function parseVmsTime(text) {
	const s = text.trim().toUpperCase();
	const midnight = new Date();
	midnight.setHours(0, 0, 0, 0);
	if (s === 'TODAY' || s === '') return midnight.getTime();
	if (s === 'YESTERDAY') return midnight.getTime() - 86400000;
	if (s === 'TOMORROW') return midnight.getTime() + 86400000;
	const m = s.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})(?:[: ](\d{1,2})(?::(\d{2}))?(?::(\d{2}))?)?/);
	if (!m) return null;
	const mon = MONTHS.indexOf(m[2]);
	if (mon < 0) return null;
	return new Date(Number(m[3]), mon, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)).getTime();
}

/**
 * A delta time for WAIT, read left to right as on VMS: "[d ]hh[:mm[:ss[.cc]]]".
 * So "00:00:05" is five seconds and "5" is five hours. Returns milliseconds, or null.
 */
export function parseDelta(text) {
	const m = text.trim().match(/^(?:(\d+)[\s-]+)?(\d+)(?::(\d+))?(?::(\d+))?(?:\.(\d{1,2}))?$/);
	if (!m) return null;
	const [, days, h, mi, s, hund] = m;
	return ((Number(days ?? 0) * 24 + Number(h)) * 3600 + Number(mi ?? 0) * 60 + Number(s ?? 0)) * 1000 + Number((hund ?? '0').padEnd(2, '0')) * 10;
}
