// Tests for the OpenVMS simulator's engine. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Shell } from './shell.js';
import { seedDisk } from './seed.js';
import { parseSpec, resolveDir } from './fs.js';
import { evaluate } from './expr.js';
import { parseArgs, substitute, matchAbbrev } from './parse.js';
import { parseDelta } from './time.js';

/** A logged-in shell; `answers` are what the user types at any prompt (null = Ctrl-Z). */
async function session() {
	const out = [];
	const answers = [];
	const io = {
		write: (text, kind = 'out') => out.push({ text, kind }),
		readLine: async () => (answers.length ? answers.shift() : null)
	};
	const sh = new Shell({ io, disk: seedDisk() });
	await sh.login();
	/** Run commands and return what they printed, as one string. */
	const run = async (...lines) => {
		out.length = 0;
		for (const l of lines) await sh.command(l);
		return out.map((o) => o.text).join('\n');
	};
	return { sh, run, out, answers };
}

test('file specs split into their parts', () => {
	assert.deepEqual(parseSpec('work:[.sub]a.txt;2'), { device: 'WORK', dir: '.SUB', name: 'A', type: 'TXT', version: { kind: 'num', n: 2 } });
	assert.equal(parseSpec('*.*;*').version.kind, 'wild');
	assert.equal(parseSpec('A.TXT;').version.kind, 'latest');
	assert.equal(parseSpec('A.TXT;-1').version.n, 1);
	assert.equal(parseSpec('A]B').error, 'DIR');
	assert.equal(parseSpec('A B').error, 'SYN');
});

test('directories resolve against the default', () => {
	assert.deepEqual(resolveDir('-', 'DEMO.PROJECTS').segs, ['DEMO']);
	assert.deepEqual(resolveDir('.X', 'DEMO').segs, ['DEMO', 'X']);
	assert.deepEqual(resolveDir('-.OTHER', 'DEMO.X').segs, ['DEMO', 'OTHER']);
	assert.deepEqual(resolveDir('000000', 'DEMO').segs, []);
	assert.equal(resolveDir('--', 'DEMO').error, 'DIR');
	assert.ok(resolveDir('...', 'DEMO').pattern.test('.DEMO.A.B'));
	assert.ok(!resolveDir('...', 'DEMO').pattern.test('.OTHER'));
});

test('expressions follow DCL rules', () => {
	const ctx = { lookup: (n) => (n === 'X' ? { t: 'i', v: 4 } : undefined), lexical: () => ({ t: 's', v: '' }) };
	const ev = (s) => evaluate(s, ctx).v;
	assert.equal(ev('1 + 2 * 3'), 7);
	assert.equal(ev('"ab" + "cd"'), 'abcd');
	assert.equal(ev('"abcabc" - "b"'), 'acabc');
	assert.equal(ev('"5" + 1'), 6);
	assert.equal(ev('X .GT. 3 .AND. X .LT. 5'), 1);
	assert.equal(ev('.NOT. 1'), -2);
	assert.equal(ev('"abc" .EQS. "abc"'), 1);
	assert.equal(ev('7 / 2'), 3);
	assert.throws(() => ev('NOPE + 1'), /UNDSYM/);
});

test('command lines parse into parameters and qualifiers', () => {
	const p = parseArgs(' A.TXT;1 , b.txt/LOG "Keep Case" /OUT=X.LIS');
	assert.deepEqual(p.params, [['A.TXT;1', 'B.TXT'], ['Keep Case']]);
	assert.deepEqual(p.quals.map((q) => [q.name, q.value]), [['LOG', null], ['OUT', 'X.LIS']]);
	assert.equal(substitute(`WRITE SYS$OUTPUT 'X' "''X'"`, () => '7'), 'WRITE SYS$OUTPUT 7 "7"');
	assert.ok(matchAbbrev('DE', [{ name: 'DELETE', min: 3 }, { name: 'DEFINE', min: 3 }]).ambiguous);
	assert.equal(matchAbbrev('DIR', [{ name: 'DIRECTORY' }, { name: 'DELETE' }]).match.name, 'DIRECTORY');
});

test('delta times read left to right', () => {
	assert.equal(parseDelta('00:00:05'), 5000);
	assert.equal(parseDelta('0:01'), 60000);
	assert.equal(parseDelta('nonsense'), null);
});

test('DIRECTORY lists every version, newest first', async () => {
	const { run } = await session();
	const out = await run('DIRECTORY');
	assert.match(out, /Directory DISK\$USER:\[DEMO\]/);
	assert.match(out, /NOTES\.TXT;3\s+NOTES\.TXT;2\s+NOTES\.TXT;1/);
	assert.match(out, /Total of 6 files\./);
	assert.match(await run('DIR [.NOPE]'), /-RMS-E-DNF, directory not found/);
	assert.match(await run('DIR *.XYZ'), /%DIRECT-W-NOFILES/);
});

test('versions: TYPE, DELETE and PURGE', async () => {
	const { run } = await session();
	assert.match(await run('TYPE NOTES.TXT;1'), /^Notes on OpenVMS\n- Every save/);
	assert.match(await run('TYPE README'), /README\.LIS;\n-RMS-E-FNF/);
	assert.match(await run('DELETE NOTES.TXT'), /%DELETE-E-DELVER/);
	await run('DELETE NOTES.TXT;1');
	assert.match(await run('PURGE/LOG'), /NOTES\.TXT;2 deleted/);
	assert.match(await run('DIR NOTES.TXT'), /Total of 1 file\./);
	assert.match(await run('PURGE'), /%PURGE-W-NOFILPURG/);
});

test('CREATE reads lines until Ctrl-Z, and COPY makes new versions', async () => {
	const { run, answers } = await session();
	answers.push('first', 'second', null);
	await run('CREATE A.TXT');
	assert.equal(await run('TYPE A.TXT'), 'first\nsecond');
	await run('COPY A.TXT A.TXT', 'COPY A.TXT B.TXT');
	assert.match(await run('DIR A.TXT,B.TXT'), /A\.TXT;2\s+A\.TXT;1\s+B\.TXT;1/);
	await run('RENAME B.TXT [.PROJECTS]');
	assert.match(await run('DIR [.PROJECTS]B.TXT'), /B\.TXT;1/);
});

test('directories need to be empty and deletable', async () => {
	const { run } = await session();
	await run('CREATE/DIRECTORY [.T]', 'COPY README.TXT [.T]');
	assert.match(await run('DELETE T.DIR;1'), /-RMS-E-PRV/);
	await run('SET PROTECTION=(O:RWED) T.DIR');
	assert.match(await run('DELETE T.DIR;1'), /DIRNOTEMPTY/);
	await run('DELETE [.T]*.*;*', 'DELETE T.DIR;1');
	assert.match(await run('DIR T.DIR'), /NOFILES/);
});

test('SET DEFAULT accepts a directory that does not exist, as VMS does', async () => {
	const { run, sh } = await session();
	await run('SET DEFAULT [.PROJECTS]');
	assert.equal(sh.defaultDir, 'DEMO.PROJECTS');
	await run('SET DEFAULT [-]');
	assert.equal(sh.defaultDir, 'DEMO');
	assert.match(await run('SET DEFAULT [.NOPE]', 'SHOW DEFAULT'), /%DCL-I-INVDEF/);
	assert.match(await run('HOME', 'SHOW DEFAULT'), /^ {2}DISK\$USER:\[DEMO\]$/);
});

test('symbols, abbreviations and symbols as commands', async () => {
	const { run } = await session();
	await run('X = 6 * 7', 'S := hello   world', 'G == "Mixed"');
	assert.match(await run('SHOW SYMBOL X'), /X = 42 {3}Hex = 0000002A/);
	assert.equal(await run('WRITE SYS$OUTPUT S, "/", G'), 'HELLO WORLD/Mixed');
	assert.match(await run('DE X'), /%DCL-W-ABVERB/);
	assert.match(await run('FROB'), /%DCL-W-IVVERB/);
	assert.match(await run('DIR/NOSUCH'), /%CLI-W-IVQUAL/);
	await run('L :== DIRECTORY/COLUMNS=1');
	assert.match(await run('L NOTES.TXT'), /NOTES\.TXT;3\nNOTES\.TXT;2/);
	assert.match(await run('RUN X.EXE'), /%SIM-I-NOTSIM, RUN exists on OpenVMS/);
});

test('logical names stand for directories', async () => {
	const { run } = await session();
	await run('DEFINE WORK DISK$USER:[DEMO.PROJECTS]');
	assert.match(await run('DIR WORK:*.COM'), /HELLO\.COM;1/);
	assert.match(await run('SHOW LOGICAL WORK'), /"WORK" = "DISK\$USER:\[DEMO\.PROJECTS\]"/);
	assert.match(await run('DEASSIGN WORK', 'DEASSIGN WORK'), /NOLOGNAM/);
	assert.match(await run('DIR NOWHERE:'), /NOSUCHDEV/);
});

test('command procedures: parameters, loops, block IF and ON', async () => {
	const { run, answers } = await session();
	assert.equal(await run('@[.PROJECTS]HELLO "Ada"'), `Hello, Ada!\nIt is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} on node FIELD.`);
	assert.equal(await run('@[.PROJECTS]COUNT 3'), '1 is odd\n2 is even\n3 is odd\nCounted to 3.');
	answers.push('unix');
	assert.match(await run('@[.PROJECTS]ASK'), /Right: Unix/);
	answers.push('$ ON WARNING THEN GOTO OOPS', '$ TYPE NOPE.TXT', '$ WRITE SYS$OUTPUT "skipped"', '$ OOPS: WRITE SYS$OUTPUT "caught"', '$ EXIT 3', null);
	await run('CREATE T.COM');
	const out = await run('@T');
	assert.match(out, /caught/);
	assert.doesNotMatch(out, /skipped/);
	assert.match(await run('SHOW SYMBOL $STATUS'), /%X00000003/);
});

test('a runaway loop is stopped', async () => {
	const { run, answers } = await session();
	answers.push('$ L: GOTO L', null);
	await run('CREATE LOOP.COM');
	assert.match(await run('@LOOP'), /%SIM-W-RUNAWAY/);
});

test('lexical functions', async () => {
	const { run } = await session();
	assert.equal(await run('WRITE SYS$OUTPUT F$EXTRACT(0,4,"OpenVMS"), F$LENGTH("abc"), F$LOCATE("V","OpenVMS"), F$ELEMENT(1,",","a,b,c")'), 'Open34b');
	assert.equal(await run('WRITE SYS$OUTPUT F$PARSE("NOTES.TXT",,,"TYPE"), F$EDIT("  a  b ","TRIM,COMPRESS,UPCASE"), F$TYPE(NOPE), "|"'), '.TXTA B|');
	assert.equal(await run('WRITE SYS$OUTPUT F$SEARCH("*.TXT")', 'WRITE SYS$OUTPUT F$SEARCH("*.TXT")', 'WRITE SYS$OUTPUT F$SEARCH("*.TXT"), "|"'), 'DISK$USER:[DEMO]NOTES.TXT;3\nDISK$USER:[DEMO]README.TXT;1\n|');
	assert.equal(await run('WRITE SYS$OUTPUT F$TRNLNM("SYS$LOGIN")'), 'DISK$USER:[DEMO]');
	assert.match(await run('WRITE SYS$OUTPUT F$TIME()'), /^[ \d]\d-[A-Z]{3}-\d{4} \d\d:\d\d:\d\d\.\d\d$/);
});

test('missing parameters are prompted for', async () => {
	const { run, answers } = await session();
	answers.push('NOTES.TXT;1');
	assert.match(await run('TYPE'), /^Notes on OpenVMS/);
});

test('DIFFERENCES compares the two newest versions', async () => {
	const { run } = await session();
	const out = await run('DIFFERENCES NOTES.TXT');
	assert.match(out, /File DISK\$USER:\[DEMO\]NOTES\.TXT;3\n {4}3 {3}- DELETE wants a version number; PURGE/);
	assert.match(out, /Number of difference sections found: 1/);
});

test('/OUTPUT writes a file instead of the screen', async () => {
	const { run } = await session();
	assert.equal(await run('DIRECTORY/OUTPUT=LIST.TXT'), '');
	assert.match(await run('TYPE LIST.TXT'), /Directory DISK\$USER:\[DEMO\]/);
});

test('the disk survives a JSON round trip', async () => {
	const { sh } = await session();
	const copy = new Shell({ io: sh.io, disk: JSON.parse(JSON.stringify(sh.disk)) });
	assert.deepEqual(copy.disk.entries('DEMO').map((e) => `${e.name}.${e.type};${e.v}`), sh.disk.entries('DEMO').map((e) => `${e.name}.${e.type};${e.v}`));
});

test('EDT line mode: type, substitute, insert, delete and exit', async () => {
	const { run, answers } = await session();
	answers.push('T WHOLE', 'S/OpenVMS/VMS/ 1', '2', 'I', 'inserted line', null, 'D 1', 'EX');
	const out = await run('EDIT/EDT NOTES.TXT');
	assert.match(out, /^ {4}1 {8}Notes on OpenVMS$/m);
	assert.match(out, /^ {4}1 {8}Notes on VMS$/m);
	assert.match(out, /1 line deleted/);
	assert.match(out, /DISK\$USER:\[DEMO\]NOTES\.TXT;4 4 lines/);
	assert.equal((await run('TYPE NOTES.TXT')).split('\n')[0], 'inserted line');
	answers.push('QUIT');
	assert.match(await run('EDIT/EDT NEW.TXT'), /Input file does not exist\n\[EOB\]/);
	assert.match(await run('DIR NEW.TXT'), /NOFILES/);
});

test('EVE saves a new version through the page, and plain EDIT means EVE', async () => {
	const { run, sh } = await session();
	let seen;
	sh.io.editScreen = async (opts) => {
		seen = opts;
		return { action: 'exit', text: `${opts.text}\nadded in EVE` };
	};
	const out = await run('EDIT NOTES.TXT');
	assert.equal(seen.buffer, 'NOTES.TXT');
	assert.match(out, /5 lines written to file DISK\$USER:\[DEMO\]NOTES\.TXT;4/);
	assert.match(seen.include('README.TXT').text, /Welcome/);
	sh.io.editScreen = async (opts) => ({ action: 'exit', text: opts.text });
	assert.match(await run('EDIT/TPU NOTES.TXT'), /No changes made/);
	sh.io.editScreen = async () => ({ action: 'quit', text: 'ignored' });
	assert.equal(await run('EDIT BRAND_NEW.TXT'), '');
	assert.match(await run('DIR BRAND_NEW.TXT'), /NOFILES/);
});

test('the boot manager boots, conversationally if asked, and a minimal startup skips the rest', async () => {
	const { runBoot } = await import('./boot.js');
	const run = async (answers) => {
		const out = [];
		const io = { write: (t) => out.push(t), readLine: async () => (answers.length ? answers.shift() : '') };
		await runBoot(io, { sleep: async () => {} });
		return out.join('\n');
	};
	const plain = await run(['HELP', 'DEVICES', 'FROB', 'BOOT', '']);
	assert.match(plain, /VSI OpenVMS Boot Manager: V9\.2-\* Build 146/);
	assert.match(plain, /BOOT <device> <sysroot> <bootflags>/);
	assert.match(plain, /BV DKA0 {8}\(HD\) = FS0/);
	assert.match(plain, /Unrecognized command: FROB/);
	assert.match(plain, /%STDRV-I-STARTUP, OpenVMS startup begun/);
	assert.match(plain, /SYSTARTUP_VMS\.COM successfully completed/);
	assert.match(plain, /SYSTEM {7}job terminated/);

	const conv = await run(['BOOT DKA0 0 1', 'SHOW VAXCLUSTER', 'SET STARTUP_P1 "MIN"', 'SHOW STARTUP_P1', 'CONTINUE', '']);
	assert.match(conv, /^VAXCLUSTER {22}0 {10}0 {9}0 {10}2  Coded-value$/m);
	assert.match(conv, /^STARTUP_P1 {17}"MIN " {5}" {4}"/m);
	assert.match(conv, /%STARTUP-I-MINIMUM/);
	assert.doesNotMatch(conv, /SYSTARTUP_VMS\.COM/);

	const shell = await run(['SHELL', 'dir', 'fs0:\\EFI\\VMS\\VMS_BOOTMGR.EFI', 'BOOT', '']);
	assert.match(shell, /'dir' is not recognized/);
	assert.equal(shell.match(/VSI OpenVMS Boot Manager/g).length, 2);
});
