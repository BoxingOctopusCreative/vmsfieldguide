// Command tables for the cheat sheet. HTML strings are trusted, hand-written content.
// `copy` is the plain text copied to the clipboard when a command is clicked.

export const sections = [
  {
    "id": "files",
    "title": "Files",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>TYPE LOGIN.COM</code>",
        "copy": "TYPE LOGIN.COM",
        "desc": "Print a file to the screen."
      },
      {
        "cmd": "<code>TYPE/PAGE LOGIN.COM</code>",
        "copy": "TYPE/PAGE LOGIN.COM",
        "desc": "Show it one screen at a time."
      },
      {
        "cmd": "<code>CREATE NOTES.TXT</code>",
        "copy": "CREATE NOTES.TXT",
        "desc": "Create a file from what you type. End with <kbd>Ctrl-Z</kbd>."
      },
      {
        "cmd": "<code>EDIT/TPU NOTES.TXT</code>",
        "copy": "EDIT/TPU NOTES.TXT",
        "desc": "Full-screen editor (EVE). <kbd>Ctrl-Z</kbd> saves and exits; <kbd>F10</kbd> also exits."
      },
      {
        "cmd": "<code>COPY NOTES.TXT [.BACKUP]</code>",
        "copy": "COPY NOTES.TXT [.BACKUP]",
        "desc": "Copy into a subdirectory, keeping the name."
      },
      {
        "cmd": "<code>RENAME NOTES.TXT TODO.TXT</code>",
        "copy": "RENAME NOTES.TXT TODO.TXT",
        "desc": "Rename or move a file."
      },
      {
        "cmd": "<code>DELETE NOTES.TXT;2</code>",
        "copy": "DELETE NOTES.TXT;2",
        "desc": "Delete one version. A version number is required."
      },
      {
        "cmd": "<code>DELETE/CONFIRM *.TMP;*</code>",
        "copy": "DELETE/CONFIRM *.TMP;*",
        "desc": "Delete every version, asking about each file."
      },
      {
        "cmd": "<code>PURGE</code>",
        "copy": "PURGE",
        "desc": "Keep only the newest version of every file here."
      },
      {
        "cmd": "<code>PURGE/KEEP=2 *.COM</code>",
        "copy": "PURGE/KEEP=2 *.COM",
        "desc": "Keep the two newest versions of each .COM file."
      },
      {
        "cmd": "<code>SEARCH [...]*.COM \"SSH$\"</code>",
        "copy": "SEARCH [...]*.COM \"SSH$\"",
        "desc": "Find text in files, including subdirectories."
      },
      {
        "cmd": "<code>DIFFERENCES TODO.TXT;3 TODO.TXT;2</code>",
        "copy": "DIFFERENCES TODO.TXT;3 TODO.TXT;2",
        "desc": "Compare two versions of a file."
      },
      {
        "cmd": "<code>APPEND A.TXT B.TXT</code>",
        "copy": "APPEND A.TXT B.TXT",
        "desc": "Add A.TXT to the end of B.TXT."
      },
      {
        "cmd": "<code>DUMP FILE.BIN</code>",
        "copy": "DUMP FILE.BIN",
        "desc": "Hex dump of a file."
      },
      {
        "cmd": "<code>SET SECURITY/PROTECTION=(S:RWED,O:RWED,G:RE,W) F.TXT</code>",
        "copy": "SET SECURITY/PROTECTION=(S:RWED,O:RWED,G:RE,W) F.TXT",
        "desc": "Set protection for System, Owner, Group and World. R=read, W=write, E=execute, D=delete."
      },
      {
        "cmd": "<code>SHOW SECURITY F.TXT</code>",
        "copy": "SHOW SECURITY F.TXT",
        "desc": "Show a file's owner, protection and ACL."
      }
    ],
    "after": null
  },
  {
    "id": "dirs",
    "title": "Directories",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>SHOW DEFAULT</code>",
        "copy": "SHOW DEFAULT",
        "desc": "Where you are now."
      },
      {
        "cmd": "<code>SET DEFAULT [.NOTES]</code>",
        "copy": "SET DEFAULT [.NOTES]",
        "desc": "Go into a subdirectory (note the leading dot)."
      },
      {
        "cmd": "<code>SET DEFAULT [-]</code>",
        "copy": "SET DEFAULT [-]",
        "desc": "Up one level. <code>[--]</code> goes up two."
      },
      {
        "cmd": "<code>SET DEFAULT SYS$LOGIN</code>",
        "copy": "SET DEFAULT SYS$LOGIN",
        "desc": "Back to your login directory."
      },
      {
        "cmd": "<code>SET DEFAULT SYS$SYSDEVICE:[SYSMGR]</code>",
        "copy": "SET DEFAULT SYS$SYSDEVICE:[SYSMGR]",
        "desc": "Go to an absolute path."
      },
      {
        "cmd": "<code>DIRECTORY</code>",
        "copy": "DIRECTORY",
        "desc": "List files here."
      },
      {
        "cmd": "<code>DIRECTORY/SIZE/DATE/OWNER</code>",
        "copy": "DIRECTORY/SIZE/DATE/OWNER",
        "desc": "Long listing."
      },
      {
        "cmd": "<code>DIRECTORY/FULL LOGIN.COM</code>",
        "copy": "DIRECTORY/FULL LOGIN.COM",
        "desc": "Everything about one file."
      },
      {
        "cmd": "<code>DIRECTORY [...]*.LOG</code>",
        "copy": "DIRECTORY [...]*.LOG",
        "desc": "Find files in this tree."
      },
      {
        "cmd": "<code>DIRECTORY/SINCE=TODAY</code>",
        "copy": "DIRECTORY/SINCE=TODAY",
        "desc": "Files changed today."
      },
      {
        "cmd": "<code>CREATE/DIRECTORY [.NOTES]</code>",
        "copy": "CREATE/DIRECTORY [.NOTES]",
        "desc": "Make a subdirectory."
      },
      {
        "cmd": "<code>SET SECURITY/PROTECTION=(O:RWED) NOTES.DIR;1</code>",
        "copy": "SET SECURITY/PROTECTION=(O:RWED) NOTES.DIR;1",
        "desc": "Step 1 of removing an empty directory: directories aren't deletable by default."
      },
      {
        "cmd": "<code>DELETE NOTES.DIR;1</code>",
        "copy": "DELETE NOTES.DIR;1",
        "desc": "Step 2: delete it. It must be empty first."
      }
    ],
    "after": null
  },
  {
    "id": "info",
    "title": "System Info",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>SHOW SYSTEM</code>",
        "copy": "SHOW SYSTEM",
        "desc": "All processes, with state and CPU time."
      },
      {
        "cmd": "<code>SHOW USERS</code>",
        "copy": "SHOW USERS",
        "desc": "Who is logged in."
      },
      {
        "cmd": "<code>SHOW TIME</code>",
        "copy": "SHOW TIME",
        "desc": "Current date and time."
      },
      {
        "cmd": "<code>SHOW LOGICAL SYS$TIMEZONE*</code>",
        "copy": "SHOW LOGICAL SYS$TIMEZONE*",
        "desc": "Time zone settings."
      },
      {
        "cmd": "<code>SHOW MEMORY</code>",
        "copy": "SHOW MEMORY",
        "desc": "Physical memory, paging and pool use."
      },
      {
        "cmd": "<code>SHOW CPU</code>",
        "copy": "SHOW CPU",
        "desc": "Processor information."
      },
      {
        "cmd": "<code>SHOW DEVICES D</code>",
        "copy": "SHOW DEVICES D",
        "desc": "Disks, with free blocks. One block = 512 bytes."
      },
      {
        "cmd": "<code>SHOW DEVICES/FULL DKA0:</code>",
        "copy": "SHOW DEVICES/FULL DKA0:",
        "desc": "Details for one disk."
      },
      {
        "cmd": "<code>SHOW QUOTA</code>",
        "copy": "SHOW QUOTA",
        "desc": "Your disk quota, if quotas are on."
      },
      {
        "cmd": "<code>SHOW LICENSE</code>",
        "copy": "SHOW LICENSE",
        "desc": "Loaded licenses (PAKs)."
      },
      {
        "cmd": "<code>PRODUCT SHOW PRODUCT</code>",
        "copy": "PRODUCT SHOW PRODUCT",
        "desc": "Installed software (PCSI kits)."
      },
      {
        "cmd": "<code>PRODUCT SHOW HISTORY</code>",
        "copy": "PRODUCT SHOW HISTORY",
        "desc": "What was installed or removed, and when."
      },
      {
        "cmd": "<code>WRITE SYS$OUTPUT F$GETSYI(\"VERSION\")</code>",
        "copy": "WRITE SYS$OUTPUT F$GETSYI(\"VERSION\")",
        "desc": "VMS version."
      },
      {
        "cmd": "<code>MONITOR SYSTEM</code>",
        "copy": "MONITOR SYSTEM",
        "desc": "Live system dashboard. <kbd>Ctrl-Z</kbd> to quit."
      },
      {
        "cmd": "<code>SHOW ERROR</code>",
        "copy": "SHOW ERROR",
        "desc": "Device error counts."
      }
    ],
    "after": null
  },
  {
    "id": "procs",
    "title": "Processes &amp; Batch",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>SHOW PROCESS</code>",
        "copy": "SHOW PROCESS",
        "desc": "Your own process."
      },
      {
        "cmd": "<code>SHOW PROCESS/ALL</code>",
        "copy": "SHOW PROCESS/ALL",
        "desc": "Your process in full: quotas, privileges, devices."
      },
      {
        "cmd": "<code>SHOW PROCESS/CONTINUOUS/ID=pid</code>",
        "copy": "SHOW PROCESS/CONTINUOUS/ID=pid",
        "desc": "Watch another process live."
      },
      {
        "cmd": "<code>STOP/IDENTIFICATION=pid</code>",
        "copy": "STOP/IDENTIFICATION=pid",
        "desc": "Kill a process (PID from SHOW SYSTEM)."
      },
      {
        "cmd": "<code>SPAWN</code>",
        "copy": "SPAWN",
        "desc": "Start a subprocess shell. <code>LOGOUT</code> returns."
      },
      {
        "cmd": "<code>SUBMIT JOB.COM</code>",
        "copy": "SUBMIT JOB.COM",
        "desc": "Run a command procedure as a batch job."
      },
      {
        "cmd": "<code>SUBMIT/AFTER=\"TOMORROW+02:00\" JOB.COM</code>",
        "copy": "SUBMIT/AFTER=\"TOMORROW+02:00\" JOB.COM",
        "desc": "Schedule it for 2 a.m. tomorrow."
      },
      {
        "cmd": "<code>SHOW QUEUE/ALL</code>",
        "copy": "SHOW QUEUE/ALL",
        "desc": "Batch and print queues with their jobs."
      },
      {
        "cmd": "<code>SHOW ENTRY</code>",
        "copy": "SHOW ENTRY",
        "desc": "Your queued jobs."
      },
      {
        "cmd": "<code>DELETE/ENTRY=n</code>",
        "copy": "DELETE/ENTRY=n",
        "desc": "Cancel a queued job."
      },
      {
        "cmd": "<code>SET PROCESS/PRIVILEGES=SYSPRV</code>",
        "copy": "SET PROCESS/PRIVILEGES=SYSPRV",
        "desc": "Turn on an authorized privilege, roughly like sudo."
      }
    ],
    "after": null
  },
  {
    "id": "symbols",
    "title": "Symbols, Logicals &amp; Scripts",
    "intro": "Symbols are DCL variables and command aliases. Logical names are system-wide or per-process path aliases. Command procedures (<code>.COM</code> files) are DCL scripts, and every line starts with <code>$</code>.",
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>LL :== DIRECTORY/SIZE/DATE</code>",
        "copy": "LL :== DIRECTORY/SIZE/DATE",
        "desc": "Define a command alias. <code>==</code> makes it global; <code>:==</code> stores the text as-is."
      },
      {
        "cmd": "<code>SHOW SYMBOL *</code>",
        "copy": "SHOW SYMBOL *",
        "desc": "List your symbols."
      },
      {
        "cmd": "<code>DELETE/SYMBOL/GLOBAL LL</code>",
        "copy": "DELETE/SYMBOL/GLOBAL LL",
        "desc": "Remove one."
      },
      {
        "cmd": "<code>DEFINE WORK SYS$LOGIN:[NOTES]</code>",
        "copy": "DEFINE WORK SYS$LOGIN:[NOTES]",
        "desc": "Make a logical name for your process."
      },
      {
        "cmd": "<code>SHOW LOGICAL SYS$LOGIN</code>",
        "copy": "SHOW LOGICAL SYS$LOGIN",
        "desc": "What a logical name points to."
      },
      {
        "cmd": "<code>DEASSIGN WORK</code>",
        "copy": "DEASSIGN WORK",
        "desc": "Remove a logical name."
      },
      {
        "cmd": "<code>EDIT/TPU SYS$LOGIN:LOGIN.COM</code>",
        "copy": "EDIT/TPU SYS$LOGIN:LOGIN.COM",
        "desc": "Your login script, run at every login. Put aliases here."
      },
      {
        "cmd": "<code>@SYS$LOGIN:LOGIN.COM</code>",
        "copy": "@SYS$LOGIN:LOGIN.COM",
        "desc": "Re-run it without logging out."
      },
      {
        "cmd": "<code>WRITE SYS$OUTPUT \"Hello, \", F$TIME()</code>",
        "copy": "WRITE SYS$OUTPUT \"Hello, \", F$TIME()",
        "desc": "Print text. <code>F$…</code> functions are lexicals (built-ins)."
      },
      {
        "cmd": "<code>SET VERIFY</code>",
        "copy": "SET VERIFY",
        "desc": "Echo each line as a script runs. <code>SET NOVERIFY</code> turns it off."
      },
      {
        "cmd": "<code>SET PROMPT=\"MYNODE$ \"</code>",
        "copy": "SET PROMPT=\"MYNODE$ \"",
        "desc": "Change your prompt."
      }
    ],
    "after": null
  },
  {
    "id": "users",
    "title": "Users &amp; Passwords",
    "intro": "Accounts live in SYSUAF, edited with AUTHORIZE. Start it with <code>SET DEFAULT SYS$SYSTEM</code>, then <code>MCR AUTHORIZE</code>. These commands go at its <code>UAF&gt;</code> prompt.",
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>SET PASSWORD</code>",
        "copy": "SET PASSWORD",
        "desc": "(At <code>$</code>) Change your own password at a no-echo prompt. Easiest for special characters."
      },
      {
        "cmd": "<code>SHOW SYSTEM</code>",
        "copy": "SHOW SYSTEM",
        "desc": "(At <code>UAF&gt;</code>) Show the SYSTEM account's settings."
      },
      {
        "cmd": "<code>SHOW */BRIEF</code>",
        "copy": "SHOW */BRIEF",
        "desc": "One line per account."
      },
      {
        "cmd": "<code>ADD JDOE/PASSWORD=temp1234/UIC=[200,201]/DEVICE=SYS$SYSDEVICE/DIRECTORY=[JDOE]/PRIVILEGES=(TMPMBX,NETMBX)/DEFPRIVILEGES=(TMPMBX,NETMBX)</code>",
        "copy": "ADD JDOE/PASSWORD=temp1234/UIC=[200,201]/DEVICE=SYS$SYSDEVICE/DIRECTORY=[JDOE]/PRIVILEGES=(TMPMBX,NETMBX)/DEFPRIVILEGES=(TMPMBX,NETMBX)",
        "desc": "Create an ordinary user. Then create their directory (next row)."
      },
      {
        "cmd": "<code>CREATE/DIRECTORY SYS$SYSDEVICE:[JDOE]/OWNER=[200,201]</code>",
        "copy": "CREATE/DIRECTORY SYS$SYSDEVICE:[JDOE]/OWNER=[200,201]",
        "desc": "(At <code>$</code>) The new user's login directory."
      },
      {
        "cmd": "<code>MODIFY SYSTEM/PASSWORD=\"New$Pass\"/NOPWDEXPIRED</code>",
        "copy": "MODIFY SYSTEM/PASSWORD=\"New$Pass\"/NOPWDEXPIRED",
        "desc": "Set a password without it being pre-expired. Quote it to keep case and special characters (needs <code>/FLAGS=PWDMIX</code>)."
      },
      {
        "cmd": "<code>MODIFY SYSTEM/PWDLIFETIME=NONE</code>",
        "copy": "MODIFY SYSTEM/PWDLIFETIME=NONE",
        "desc": "Stop a password from expiring."
      },
      {
        "cmd": "<code>MODIFY JDOE/FLAGS=DISUSER</code>",
        "copy": "MODIFY JDOE/FLAGS=DISUSER",
        "desc": "Lock an account. <code>/FLAGS=NODISUSER</code> unlocks it."
      },
      {
        "cmd": "<code>REMOVE JDOE</code>",
        "copy": "REMOVE JDOE",
        "desc": "Delete an account (not its files)."
      },
      {
        "cmd": "<code>EXIT</code>",
        "copy": "EXIT",
        "desc": "Leave AUTHORIZE."
      }
    ],
    "after": null
  },
  {
    "id": "net",
    "title": "TCP/IP &amp; SSH",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>TCPIP SHOW INTERFACE</code>",
        "copy": "TCPIP SHOW INTERFACE",
        "desc": "Network interfaces and their IP addresses."
      },
      {
        "cmd": "<code>TCPIP SHOW ROUTE</code>",
        "copy": "TCPIP SHOW ROUTE",
        "desc": "Routing table."
      },
      {
        "cmd": "<code>TCPIP SHOW SERVICE</code>",
        "copy": "TCPIP SHOW SERVICE",
        "desc": "Network services and whether they're enabled (SSHD22, TELNET, FTP…)."
      },
      {
        "cmd": "<code>TCPIP PING example.com</code>",
        "copy": "TCPIP PING example.com",
        "desc": "Check that another host is reachable."
      },
      {
        "cmd": "<code>@SYS$MANAGER:TCPIP$CONFIG</code>",
        "copy": "@SYS$MANAGER:TCPIP$CONFIG",
        "desc": "Menu-driven TCP/IP configuration."
      },
      {
        "cmd": "<code>@SYS$STARTUP:TCPIP$STARTUP</code>",
        "copy": "@SYS$STARTUP:TCPIP$STARTUP",
        "desc": "Start TCP/IP Services."
      },
      {
        "cmd": "<code>@SYS$STARTUP:SSH$STARTUP</code>",
        "copy": "@SYS$STARTUP:SSH$STARTUP",
        "desc": "Start the SSH server. Re-run it after restarting TCP/IP."
      },
      {
        "cmd": "<code>@SSH$ROOT:[BIN]SSH$DEFINE_COMMANDS.COM ALL</code>",
        "copy": "@SSH$ROOT:[BIN]SSH$DEFINE_COMMANDS.COM ALL",
        "desc": "Define SSHSHOW, SSHSTART, SSHSTOP and SSHVERSION."
      },
      {
        "cmd": "<code>SSHSHOW</code>",
        "copy": "SSHSHOW",
        "desc": "Running SSH server processes and connections."
      },
      {
        "cmd": "<code>TYPE SSH$ROOT:[ETC]SSHD_CONFIG</code>",
        "copy": "TYPE SSH$ROOT:[ETC]SSHD_CONFIG",
        "desc": "The SSH server's configuration."
      }
    ],
    "after": null
  },
  {
    "id": "admin",
    "title": "Admin, Help &amp; Shutdown",
    "intro": null,
    "heads": [
      "Command",
      "What it does"
    ],
    "rows": [
      {
        "cmd": "<code>HELP</code>",
        "copy": "HELP",
        "desc": "Built-in help for every command. <code>HELP SET DEFAULT</code> drills in."
      },
      {
        "cmd": "<code>HELP/MESSAGE NOCOMD</code>",
        "copy": "HELP/MESSAGE NOCOMD",
        "desc": "Explain an error code from a <code>%FACILITY-L-CODE</code> message."
      },
      {
        "cmd": "<code>EDIT/TPU SYS$MANAGER:SYSTARTUP_VMS.COM</code>",
        "copy": "EDIT/TPU SYS$MANAGER:SYSTARTUP_VMS.COM",
        "desc": "Site startup script: add things that should start at boot."
      },
      {
        "cmd": "<code>EDIT/TPU SYS$MANAGER:SYLOGIN.COM</code>",
        "copy": "EDIT/TPU SYS$MANAGER:SYLOGIN.COM",
        "desc": "Login script that runs for every user."
      },
      {
        "cmd": "<code>REPLY/ALL \"Going down in 5 minutes\"</code>",
        "copy": "REPLY/ALL \"Going down in 5 minutes\"",
        "desc": "Broadcast to all terminals."
      },
      {
        "cmd": "<code>BACKUP [...]*.*;* DKA100:SAVE.BCK/SAVE_SET</code>",
        "copy": "BACKUP [...]*.*;* DKA100:SAVE.BCK/SAVE_SET",
        "desc": "Save a directory tree into one backup file."
      },
      {
        "cmd": "<code>@SYS$SYSTEM:SHUTDOWN</code>",
        "copy": "@SYS$SYSTEM:SHUTDOWN",
        "desc": "Clean shutdown. It asks a few questions; the defaults are fine. Always do this before powering off the machine or closing the emulator."
      }
    ],
    "after": "<strong>Message format:</strong> errors look like <code>%DCL-W-NOCOMD, …</code>, which is facility, severity, then code. The severity letter is S (success), I (information), W (warning), E (error) or F (fatal). <code>-</code> instead of <code>%</code> means a follow-on line of the same message."
  }
];
