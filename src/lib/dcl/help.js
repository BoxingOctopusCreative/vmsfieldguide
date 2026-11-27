// The simulator's HELP text: one topic per command it knows, written for this site.

export const HELP = {
	'@': `Runs a command procedure (a .COM file) one line at a time.

Format:  @file [p1 [p2 ...]]

Up to eight parameters become the symbols P1 to P8 inside the procedure.
Unquoted parameters are upper-cased; put them in quotes to keep their case.

Example:  @[.PROJECTS]HELLO "Ada"`,
	APPEND: `Adds the contents of one or more files to the end of another file.

Format:  APPEND input[,...] output

Qualifiers:  /LOG  /NEW_VERSION (create the output if it doesn't exist)`,
	ASSIGN: `Creates a logical name. Same as DEFINE, but the parameters come the other way round.

Format:  ASSIGN equivalence-name logical-name[:]`,
	COPY: `Copies files. The output takes any missing parts (name, type) from the input,
and gets a new version number if the file already exists.
Several inputs and one output name are joined into a single file.

Format:  COPY input[,...] output

Qualifiers:  /LOG

Examples:  COPY NOTES.TXT NOTES.BAK
           COPY *.TXT [.PROJECTS]`,
	CREATE: `Creates a file from the lines you type. Press Ctrl-Z on a line of its own to finish.
With /DIRECTORY, creates a directory instead.

Format:  CREATE file
         CREATE/DIRECTORY [directory]

Qualifiers:  /DIRECTORY  /LOG`,
	DEASSIGN: `Removes a logical name you defined.

Format:  DEASSIGN logical-name

Qualifiers:  /JOB  /ALL`,
	DEFINE: `Creates a logical name: a name that stands for a device, directory or file.

Format:  DEFINE logical-name equivalence-name

Qualifiers:  /JOB (instead of the process table)

Example:  DEFINE WORK DISK$USER:[DEMO.PROJECTS]
          DIRECTORY WORK:`,
	DELETE: `Deletes files. You must give a version number, or ;* for every version,
so you can't delete every copy by accident. A directory must be empty,
and its protection must allow the owner to delete it.
With /SYMBOL, deletes a symbol instead.

Format:  DELETE file;version[,...]
         DELETE/SYMBOL name

Qualifiers:  /CONFIRM  /LOG  /SYMBOL  /GLOBAL  /ALL

Examples:  DELETE NOTES.TXT;1
           DELETE *.BAK;*`,
	DIFFERENCES: `Compares two files line by line. With one file, compares its newest version
with the version before it.

Format:  DIFFERENCES file1 [file2]

Example:  DIFFERENCES NOTES.TXT`,
	DIRECTORY: `Lists files. With no file spec, lists every version of every file in the
default directory. [...] searches the directory and everything below it.

Format:  DIRECTORY [file[,...]]

Qualifiers:  /SIZE[=ALL]  /DATE[=MODIFIED]  /FULL  /OWNER  /PROTECTION
             /COLUMNS=n  /VERSIONS=n  /SINCE=time  /BEFORE=time  /TOTAL
             /BRIEF  /NOHEADING  /NOTRAILING  /OUTPUT=file

Examples:  DIRECTORY *.TXT
           DIRECTORY/SIZE/DATE
           DIRECTORY [...]*.COM`,
	EDIT: `Edits a file. A file that doesn't exist yet is created when you save.

Format:  EDIT file           (here, EVE: LOGIN.COM defines EDIT :== EDIT/TPU)
         EDIT/TPU file       EVE, the full-screen editor
         EDIT/EDT file       EDT, in line mode

EVE:  type to edit, arrows to move. Ctrl-Z saves and exits.
      F4 (or the Do button) gives a Command: prompt: EXIT, QUIT, FIND text,
      REPLACE old new, LINE n, TOP, BOTTOM, ERASE LINE, INCLUDE FILE, WRITE FILE,
      SET OVERSTRIKE, SET INSERT, HELP.

EDT:  commands at the * prompt: TYPE WHOLE, INSERT, DELETE, SUBSTITUTE/old/new/,
      EXIT and QUIT. Type HELP at the * prompt for more.

Saving always makes a new version; the old one is kept.

Qualifiers:  /TPU  /EDT  /READ_ONLY`,
	EXIT: `Ends the current command procedure, optionally with a status value.

Format:  EXIT [status]`,
	GOSUB: `Calls a subroutine at a label in a command procedure; RETURN comes back.

Format:  GOSUB label`,
	GOTO: `Jumps to a label in a command procedure. A label is a name followed by a colon.

Format:  GOTO label`,
	HELP: `Shows help on the simulator's commands.

Format:  HELP [topic]`,
	IF: `Runs a command only if a condition is true.

Format:  IF expression THEN command

In a command procedure you can also write a block:
  $ IF expression
  $ THEN
  $   ...
  $ ELSE
  $   ...
  $ ENDIF

Compare numbers with .EQ. .NE. .LT. .LE. .GT. .GE., strings with .EQS. .NES. and
the like, and combine with .AND. .OR. .NOT.`,
	INQUIRE: `Asks for a value at the terminal and stores it in a symbol.

Format:  INQUIRE symbol ["prompt"]

Qualifiers:  /GLOBAL  /NOPUNCTUATION`,
	LEXICALS: `Lexical functions return information for use in expressions.
The simulator knows these:

  F$CVTIME   F$DIRECTORY   F$EDIT      F$ELEMENT   F$ENVIRONMENT  F$EXTRACT
  F$FILE_ATTRIBUTES        F$GETJPI    F$GETSYI    F$INTEGER      F$LENGTH
  F$LOCATE   F$MESSAGE     F$MODE      F$PARSE     F$SEARCH       F$STRING
  F$TIME     F$TRNLNM      F$TYPE      F$USER

Examples:  WRITE SYS$OUTPUT F$TIME()
           WRITE SYS$OUTPUT F$EXTRACT(0, 5, "OpenVMS")
           x = F$SEARCH("*.TXT")`,
	LOGOUT: `Ends your session. Your files stay on the simulated disk.`,
	ON: `Sets what a command procedure does when a command fails.

Format:  ON WARNING|ERROR|SEVERE_ERROR THEN EXIT|CONTINUE|GOTO label

The default is ON ERROR THEN EXIT.`,
	PURGE: `Deletes old versions of files, keeping the newest ones.

Format:  PURGE [file[,...]]

Qualifiers:  /KEEP=n (default 1)  /LOG`,
	RECALL: `Shows or brings back earlier commands. You can also use the Up and Down arrow keys.

Format:  RECALL [n | text]

Qualifiers:  /ALL  /ERASE`,
	RENAME: `Renames or moves files, including directories (NAME.DIR;1).

Format:  RENAME input[,...] output

Qualifiers:  /LOG  /NONEW_VERSION`,
	SEARCH: `Finds lines that contain a string. Searching ignores case unless you use /EXACT.

Format:  SEARCH file[,...] string[,...]

Qualifiers:  /EXACT  /NUMBERS  /MATCH=AND|OR|NAND|NOR  /OUTPUT=file

Example:  SEARCH *.TXT VMS`,
	SET: `Changes a setting. The simulator knows these:

  SET DEFAULT directory          change your default (current) directory
  SET PROMPT="string"            change the $ prompt
  SET PROTECTION=(code) file     change a file's protection, e.g. (O:RWED,W:R)
  SET PROTECTION=(code)/DEFAULT  change the protection new files get
  SET VERIFY / SET NOVERIFY      show command procedure lines as they run`,
	SHOW: `Displays information. The simulator knows these:

  SHOW DEFAULT       SHOW TIME          SHOW SYMBOL name    SHOW LOGICAL [name]
  SHOW TRANSLATION   SHOW PROTECTION    SHOW PROCESS        SHOW SYSTEM
  SHOW USERS         SHOW STATUS        SHOW DEVICES`,
	SIMULATOR: `This is a simulation of DCL written in JavaScript for OpenVMS Field Notes.
It isn't OpenVMS, and no OpenVMS software is running.

It models the command language, file specifications, version numbers, symbols,
logical names and command procedures. Output follows OpenVMS V9.2 closely but
isn't identical, and the system information (SHOW SYSTEM and so on) is made up.

Messages that start with %SIM come from the simulator, not from OpenVMS.`,
	SYMBOLS: `Symbols are DCL's variables.

  name = expression     local symbol (this procedure level)
  name == expression    global symbol (every level)
  name := text          string assignment, no quotes needed
  name :== text         global string assignment

Use 'name' to put a symbol's value into a command line.
A symbol can also stand for a command:  LS :== DIRECTORY/SIZE`,
	TYPE: `Displays a file. The default file type is .LIS, so give the type: TYPE NOTES.TXT.

Format:  TYPE file[,...]

Qualifiers:  /OUTPUT=file  /PAGE`,
	WAIT: `Pauses for a time, given as hours:minutes:seconds. Ctrl-Y stops it.

Format:  WAIT time

Example:  WAIT 00:00:05`,
	WRITE: `Writes text to the terminal. Separate several expressions with commas.

Format:  WRITE SYS$OUTPUT expression[,...]

Example:  WRITE SYS$OUTPUT "Today is ", F$CVTIME(,,"WEEKDAY")`
};
