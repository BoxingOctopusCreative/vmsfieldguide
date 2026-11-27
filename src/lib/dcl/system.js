// Facts about the simulated system, shared by the shell, commands and lexical functions.

export const USER = 'DEMO';
export const NODE = 'FIELD';
export const VERSION = 'V9.2-3';
export const HOME = 'DEMO';
/** The demo account's password, shown on the login screen. Checked in the page only, never stored. */
export const PASSWORD = 'VMS';

/** RMS and system message lines used under many commands. */
export const RMS = {
	FNF: '-RMS-E-FNF, file not found',
	DNF: '-RMS-E-DNF, directory not found',
	SYN: '-RMS-F-SYN, file specification syntax error',
	DIR: '-RMS-F-DIR, error in directory name',
	DEV: '-SYSTEM-W-NOSUCHDEV, no such device available',
	VER: '-RMS-F-VER, invalid file version number',
	FEX: '-RMS-E-FEX, file already exists, not superseded',
	PRV: '-RMS-E-PRV, insufficient privilege or file protection violation',
	WLD: '-RMS-F-WLD, invalid wildcard operation'
};

/** True if a qualifier was given and not negated. */
export const on = (cmd, name) => {
	const q = cmd.quals.get(name);
	return !!q && !q.neg;
};
