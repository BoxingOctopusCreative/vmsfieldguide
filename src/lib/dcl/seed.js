// The files a new visitor finds in DISK$USER:[DEMO].

import { Disk, DEFAULT_DIR_PROT } from './fs.js';

const DAY = 86400000;

const LOGIN = `$! LOGIN.COM runs every time you log in.
$! Symbols defined here are shortcuts for the whole session.
$ IF F$MODE() .NES. "INTERACTIVE" THEN EXIT
$ EDIT :== EDIT/TPU          ! plain EDIT opens EVE; EDIT/EDT still opens EDT
$ HOME :== SET DEFAULT SYS$LOGIN
$ WHERE :== SHOW DEFAULT
$ EXIT`;

const README = `Welcome to the OpenVMS Field Notes simulated OpenVMS system.

This is your own directory, DISK$USER:[DEMO]. What you do here is saved in
your browser, so it will still be here next time. "Reset disk" starts over.

Some things to try:

  DIRECTORY                  list the files here (every version)
  TYPE NOTES.TXT             show the newest version of a file
  TYPE NOTES.TXT;1           show an older one
  DIFFERENCES NOTES.TXT      compare the two newest versions
  PURGE                      delete the old versions
  @[.PROJECTS]HELLO "Ada"    run a command procedure
  SET DEFAULT [.PROJECTS]    move into a subdirectory
  EDIT NOTES.TXT             edit a file full screen in EVE (Ctrl-Z saves)
  EDIT/EDT NOTES.TXT         the same file in EDT, the line-mode editor
  HOME                       a symbol LOGIN.COM defined; takes you back here
  HELP                       the commands this simulator knows`;

const NOTES = [
	`Notes on OpenVMS
- Every save makes a new version: NOTES.TXT;1, ;2, ;3`,
	`Notes on OpenVMS
- Every save makes a new version: NOTES.TXT;1, ;2, ;3
- DELETE wants a version number. PURGE keeps the newest.`,
	`Notes on OpenVMS
- Every save makes a new version: NOTES.TXT;1, ;2, ;3
- DELETE wants a version number; PURGE keeps the newest.
- SET DEFAULT [-] goes up a directory, like cd .. on Unix.`
];

const HELLO = `$! HELLO.COM - say hello to P1, or to whoever is logged in.
$! Try:  @HELLO   and   @HELLO "Ada"
$ name = P1
$ IF name .EQS. "" THEN name = F$EDIT(F$GETJPI("","USERNAME"),"TRIM")
$ WRITE SYS$OUTPUT "Hello, ''name'!"
$ WRITE SYS$OUTPUT "It is ", F$CVTIME(,,"WEEKDAY"), " on node ", F$GETSYI("NODENAME"), "."
$ EXIT`;

const COUNT = `$! COUNT.COM - count from 1 to P1 (default 5), with a loop and a block IF.
$! Try:  @COUNT 8
$ limit = F$INTEGER(P1)
$ IF limit .LE. 0 THEN limit = 5
$ i = 1
$ LOOP:
$   IF i .GT. limit THEN GOTO DONE
$   IF (i / 2) * 2 .EQ. i
$   THEN
$     WRITE SYS$OUTPUT i, " is even"
$   ELSE
$     WRITE SYS$OUTPUT i, " is odd"
$   ENDIF
$   i = i + 1
$   GOTO LOOP
$ DONE:
$ WRITE SYS$OUTPUT "Counted to ", limit, "."
$ EXIT`;

const FILES = `$! FILES.COM - list the files in SYS$LOGIN with F$SEARCH and F$PARSE.
$ count = 0
$ LOOP:
$   file = F$SEARCH("SYS$LOGIN:*.*")
$   IF file .EQS. "" THEN GOTO DONE
$   count = count + 1
$   name = F$PARSE(file,,,"NAME") + F$PARSE(file,,,"TYPE")
$   WRITE SYS$OUTPUT name, " (", F$FILE_ATTRIBUTES(file,"EOF"), " blocks)"
$   GOTO LOOP
$ DONE:
$ WRITE SYS$OUTPUT count, " files in SYS$LOGIN"
$ EXIT`;

const ASK = `$! ASK.COM - ask a question and answer it.
$ INQUIRE answer "Which is older, VMS or Unix"
$ IF answer .EQS. "UNIX"
$ THEN
$   WRITE SYS$OUTPUT "Right: Unix dates from 1969, VAX/VMS from 1977."
$ ELSE
$   WRITE SYS$OUTPUT "Unix is older: 1969, against VAX/VMS in 1977."
$ ENDIF
$ EXIT`;

const TODO = `Things to try in the simulator
[ ] Make a directory:     CREATE/DIRECTORY [.SCRATCH]
[ ] Write a file:         CREATE [.SCRATCH]HELLO.TXT  (Ctrl-Z to finish)
[ ] Copy it twice:        COPY [.SCRATCH]HELLO.TXT [.SCRATCH]
[ ] Look at the versions: DIRECTORY [.SCRATCH]
[ ] Tidy up:              PURGE [.SCRATCH]
[ ] Remove it all:        DELETE [.SCRATCH]*.*;*`;

/** A fresh disk with the demo files, dated over the last few days. */
export function seedDisk() {
	const disk = new Disk();
	const now = Date.now();
	const at = (daysAgo, minutes = 0) => now - daysAgo * DAY - minutes * 60000;
	const put = (dir, name, type, text, created) => {
		const v = disk.write(dir, name, type, text);
		const rec = disk.versions(dir, name, type).find((r) => r.v === v);
		rec.created = created;
		rec.modified = created;
	};

	disk.mkdir('DEMO');
	disk.dir('DEMO').created = at(30);
	disk.mkdir('DEMO.PROJECTS');
	disk.dir('DEMO.PROJECTS').created = at(12);
	disk.dir('DEMO.PROJECTS').prot = { ...DEFAULT_DIR_PROT };

	put('DEMO', 'LOGIN', 'COM', LOGIN, at(30));
	put('DEMO', 'README', 'TXT', README, at(30, -5));
	NOTES.forEach((t, i) => put('DEMO', 'NOTES', 'TXT', t, at(3 - i, 90 - i * 20)));
	put('DEMO.PROJECTS', 'HELLO', 'COM', HELLO, at(12));
	put('DEMO.PROJECTS', 'COUNT', 'COM', COUNT, at(11));
	put('DEMO.PROJECTS', 'FILES', 'COM', FILES, at(9));
	put('DEMO.PROJECTS', 'ASK', 'COM', ASK, at(8));
	put('DEMO.PROJECTS', 'TODO', 'TXT', TODO, at(2));
	return disk.toJSON();
}
