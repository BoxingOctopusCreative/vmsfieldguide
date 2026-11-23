// DCL ↔ Unix comparison table.
// Plain strings throughout; in `note`, text wrapped in `backticks` renders as code.
// `unix` is the closest equivalent, not always an exact one; the note says how they differ.

/** @typedef {{ dcl: string, unix: string, note?: string }} Row */
/** @typedef {{ id: string, title: string, intro?: string, rows: Row[] }} Group */

/** @type {Group[]} */
export const groups = [
	{
		id: 'nav',
		title: 'Moving Around',
		rows: [
			{ dcl: 'SHOW DEFAULT', unix: 'pwd' },
			{ dcl: 'SET DEFAULT [.NOTES]', unix: 'cd notes', note: 'The leading dot means "relative to here". `[NOTES]` without it is from the top of the disk.' },
			{ dcl: 'SET DEFAULT [-]', unix: 'cd ..', note: '`[--]` goes up two levels.' },
			{ dcl: 'SET DEFAULT SYS$LOGIN', unix: 'cd ~', note: '`SYS$LOGIN` is a logical name for your home directory.' },
			{ dcl: 'SET DEFAULT DKA0:[PROJECTS.NOTES]', unix: 'cd /projects/notes', note: 'An absolute path is device plus directory.' }
		]
	},
	{
		id: 'list',
		title: 'Listing and Finding Files',
		rows: [
			{ dcl: 'DIRECTORY', unix: 'ls' },
			{ dcl: 'DIRECTORY/SIZE/DATE/OWNER/PROTECTION', unix: 'ls -l', note: 'Sizes are in 512-byte blocks.' },
			{ dcl: 'DIRECTORY/FULL LOGIN.COM', unix: 'stat .profile', note: 'Also shows record format and other RMS attributes Unix has no concept of.' },
			{ dcl: 'DIRECTORY [...]*.LOG', unix: "find . -name '*.log'", note: '`[...]` means "this directory and everything below it".' },
			{ dcl: 'DIRECTORY/SINCE=TODAY', unix: 'find . -maxdepth 1 -newermt today', note: '`-newermt` is GNU and BSD find; both Linux and macOS have it.' },
			{ dcl: 'DIRECTORY/SIZE=ALLOCATION/GRAND_TOTAL [...]', unix: 'du -sh .', note: 'Total space used by this tree, in blocks.' },
			{ dcl: 'SHOW DEVICES D', unix: 'df -h', note: 'Lists disks with free blocks.' }
		]
	},
	{
		id: 'files',
		title: 'Working with Files',
		rows: [
			{ dcl: 'TYPE NOTES.TXT', unix: 'cat notes.txt' },
			{ dcl: 'TYPE/PAGE NOTES.TXT', unix: 'less notes.txt' },
			{ dcl: 'TYPE/HEAD=10 NOTES.TXT', unix: 'head -n 10 notes.txt', note: '`/HEAD` and `/TAIL` need OpenVMS V8.4 or later.' },
			{ dcl: 'TYPE/TAIL=10 NOTES.TXT', unix: 'tail -n 10 notes.txt' },
			{ dcl: 'CREATE NOTES.TXT', unix: 'cat > notes.txt', note: 'Type the text, then end with Ctrl-Z (Ctrl-D on Unix).' },
			{ dcl: 'COPY A.TXT B.TXT', unix: 'cp a.txt b.txt' },
			{ dcl: 'BACKUP [.SRC...]*.*;* [.DEST...]', unix: 'cp -R src dest', note: 'BACKUP is the usual way to copy a whole tree with its versions and attributes.' },
			{ dcl: 'RENAME A.TXT B.TXT', unix: 'mv a.txt b.txt' },
			{ dcl: 'DELETE NOTES.TXT;*', unix: 'rm notes.txt', note: 'A version is required: `;*` deletes all of them, `;3` just one.' },
			{ dcl: 'DELETE/CONFIRM *.TMP;*', unix: 'rm -i *.tmp' },
			{ dcl: 'PURGE', unix: '(none)', note: 'Deletes old versions, keeping the newest. Unix files have no versions to purge.' },
			{ dcl: 'APPEND A.TXT B.TXT', unix: 'cat a.txt >> b.txt' },
			{ dcl: 'SET FILE/ENTER=ALIAS.TXT NOTES.TXT', unix: 'ln notes.txt alias.txt', note: 'A second directory entry for the same file, like a hard link. There are no symlinks; logical names fill that role.' },
			{ dcl: 'DIFFERENCES A.TXT B.TXT', unix: 'diff a.txt b.txt', note: 'With one argument it compares the two newest versions of the file.' },
			{ dcl: 'SORT IN.TXT OUT.TXT', unix: 'sort in.txt > out.txt' },
			{ dcl: 'DUMP FILE.BIN', unix: 'hexdump -C file.bin' },
			{ dcl: 'CHECKSUM/ALGORITHM=MD5 FILE.BIN', unix: 'md5sum file.bin', note: 'The result goes into the symbol `CHECKSUM$CHECKSUM`; show it with `SHOW SYMBOL CHECKSUM$CHECKSUM`. On macOS it\'s `md5`.' },
			{ dcl: 'EDIT/TPU NOTES.TXT', unix: 'nano notes.txt', note: 'EVE, the TPU editor, is the closest thing to nano or vi. Ctrl-Z saves and exits.' }
		]
	},
	{
		id: 'search',
		title: 'Searching Text',
		rows: [
			{ dcl: 'SEARCH NOTES.TXT "error"', unix: 'grep -i error notes.txt', note: 'SEARCH ignores case by default; add `/EXACT` for a case-sensitive match.' },
			{ dcl: 'SEARCH/EXACT NOTES.TXT "Error"', unix: 'grep Error notes.txt' },
			{ dcl: 'SEARCH/MATCH=NOR NOTES.TXT "debug"', unix: 'grep -v debug notes.txt' },
			{ dcl: 'SEARCH [...]*.COM "SSH$"', unix: "grep -r 'SSH\\$' .", note: 'Search a whole tree.' },
			{ dcl: 'SEARCH/WINDOW=(3,3) LOG.TXT "fail"', unix: 'grep -C 3 fail log.txt', note: 'Three lines of context before and after each match.' }
		]
	},
	{
		id: 'dirs',
		title: 'Directories',
		rows: [
			{ dcl: 'CREATE/DIRECTORY [.NOTES]', unix: 'mkdir notes' },
			{ dcl: 'CREATE/DIRECTORY [.A.B.C]', unix: 'mkdir -p a/b/c', note: 'Intermediate directories are created automatically.' },
			{ dcl: 'SET SECURITY/PROTECTION=(O:RWED) NOTES.DIR;1', unix: '(none)', note: 'Directories aren\'t deletable by default; this makes one deletable.' },
			{ dcl: 'DELETE NOTES.DIR;1', unix: 'rmdir notes', note: 'Must be empty. There\'s no classic one-step `rm -r`: delete the files, then the directories from the bottom up.' }
		]
	},
	{
		id: 'perms',
		title: 'Ownership and Permissions',
		intro: 'VMS protection has four classes (System, Owner, Group, World) and four rights (Read, Write, Execute, Delete), plus optional ACLs.',
		rows: [
			{ dcl: 'SHOW SECURITY NOTES.TXT', unix: 'ls -l notes.txt' },
			{ dcl: 'SET SECURITY/PROTECTION=(W:RE) NOTES.TXT', unix: 'chmod o+rx notes.txt' },
			{ dcl: 'SET SECURITY/PROTECTION=(G,W) NOTES.TXT', unix: 'chmod go-rwx notes.txt', note: 'A class with no rights listed loses all of them.' },
			{ dcl: 'SET SECURITY/OWNER=[200,201] NOTES.TXT', unix: 'chown user:group notes.txt', note: 'Owners are UICs: [group,member].' },
			{ dcl: 'SET SECURITY/ACL=(IDENTIFIER=JDOE,ACCESS=READ) NOTES.TXT', unix: 'setfacl -m u:jdoe:r notes.txt', note: 'On macOS: `chmod +a "jdoe allow read" notes.txt`.' },
			{ dcl: 'SET PROTECTION=(S:RWED,O:RWED,G,W)/DEFAULT', unix: 'umask 077', note: 'Default protection for new files.' }
		]
	},
	{
		id: 'procs',
		title: 'Processes and Jobs',
		rows: [
			{ dcl: 'SHOW SYSTEM', unix: 'ps -e' },
			{ dcl: 'SHOW PROCESS', unix: 'ps -p $$', note: 'Your own process. `/ALL` adds quotas, privileges and devices.' },
			{ dcl: 'MONITOR PROCESSES/TOPCPU', unix: 'top', note: 'Ctrl-Z to quit.' },
			{ dcl: 'STOP/IDENTIFICATION=2040011C', unix: 'kill -9 1234', note: 'STOP is immediate; there\'s no polite SIGTERM equivalent.' },
			{ dcl: 'SET PROCESS/PRIORITY=2', unix: 'renice 10 -p $$', note: 'Higher numbers mean higher priority on VMS, the opposite of nice values.' },
			{ dcl: 'RUN PROG.EXE', unix: './prog' },
			{ dcl: 'MCR AUTHORIZE', unix: '/usr/sbin/prog', note: '`MCR` runs a program from `SYS$SYSTEM` and can pass it arguments, much like running a tool from `/usr/sbin`.' },
			{ dcl: 'SPAWN', unix: 'sh', note: 'A subprocess shell. `LOGOUT` returns to the parent.' },
			{ dcl: 'SPAWN/NOWAIT @LONGJOB.COM', unix: './longjob.sh &' },
			{ dcl: 'SUBMIT JOB.COM', unix: 'nohup ./job.sh &', note: 'Runs in a batch queue and writes a log file to your home directory.' },
			{ dcl: 'SUBMIT/AFTER="TOMORROW+02:00" JOB.COM', unix: 'echo ./job.sh | at 02:00 tomorrow', note: 'No cron: recurring jobs resubmit themselves at the end of each run.' },
			{ dcl: 'SHOW ENTRY', unix: 'atq' },
			{ dcl: 'DELETE/ENTRY=123', unix: 'atrm 123' },
			{ dcl: 'WAIT 00:00:05', unix: 'sleep 5' },
			{ dcl: 'Ctrl-Y', unix: 'Ctrl-C', note: 'Interrupt the running program.' },
			{ dcl: 'Ctrl-T', unix: 'Ctrl-T', note: 'Shows what the process is doing. Works on macOS and BSD (SIGINFO), not on Linux.' }
		]
	},
	{
		id: 'shell',
		title: 'Shell, Symbols and Scripts',
		intro: 'DCL symbols act like shell variables, and logical names act like environment variables and symlinks combined.',
		rows: [
			{ dcl: 'NAME = "value"', unix: 'NAME=value', note: 'Local to the current command procedure.' },
			{ dcl: 'NAME == "value"', unix: 'export NAME=value', note: 'Global: visible everywhere in your process.' },
			{ dcl: 'SHOW SYMBOL NAME', unix: 'echo $NAME' },
			{ dcl: `WRITE SYS$OUTPUT "Hello, ''NAME'"`, unix: 'echo "Hello, $NAME"', note: "Inside quotes, `''NAME'` substitutes the symbol." },
			{ dcl: 'LL :== DIRECTORY/SIZE/DATE', unix: "alias ll='ls -l'" },
			{ dcl: 'DEFINE WORK SYS$LOGIN:[NOTES]', unix: 'export WORK=~/notes', note: 'Unlike a variable, a logical works anywhere a path goes: `DIR WORK:`.' },
			{ dcl: 'SHOW LOGICAL', unix: 'env' },
			{ dcl: 'DEASSIGN WORK', unix: 'unset WORK' },
			{ dcl: '@SCRIPT.COM A B', unix: 'sh script.sh a b', note: 'Arguments arrive as `P1` to `P8`.' },
			{ dcl: 'IF F$SEARCH("NOTES.TXT") .NES. "" THEN TYPE NOTES.TXT', unix: '[ -e notes.txt ] && cat notes.txt' },
			{ dcl: 'SHOW SYMBOL $STATUS', unix: 'echo $?', note: 'Odd values mean success, even values mean failure.' },
			{ dcl: 'ON ERROR THEN EXIT', unix: 'set -e' },
			{ dcl: 'SET VERIFY', unix: 'set -x' },
			{ dcl: 'INQUIRE ANSWER "Continue"', unix: 'read -p "Continue? " ANSWER' },
			{ dcl: 'PIPE SHOW SYSTEM | SEARCH SYS$PIPE SSH', unix: 'ps -e | grep ssh', note: 'Pipes need the `PIPE` prefix; `SYS$PIPE` is the standard input.' },
			{ dcl: 'PIPE SHOW SYSTEM > PROCS.TXT', unix: 'ps -e > procs.txt', note: 'Many commands also accept `/OUTPUT=file`.' },
			{ dcl: 'RECALL/ALL', unix: 'history' },
			{ dcl: 'HELP SEARCH', unix: 'man grep' },
			{ dcl: 'SYS$LOGIN:LOGIN.COM', unix: '~/.profile', note: 'Runs at each login.' },
			{ dcl: 'SYS$MANAGER:SYLOGIN.COM', unix: '/etc/profile', note: 'Runs at every user\'s login.' },
			{ dcl: 'SYS$MANAGER:SYSTARTUP_VMS.COM', unix: '/etc/rc.local', note: 'Site-specific startup at boot. The modern Linux counterpart is a systemd unit.' }
		]
	},
	{
		id: 'users',
		title: 'Users and Privileges',
		rows: [
			{ dcl: 'SHOW USERS', unix: 'who' },
			{ dcl: 'WRITE SYS$OUTPUT F$GETJPI("","USERNAME")', unix: 'whoami' },
			{ dcl: 'SHOW PROCESS/PRIVILEGES', unix: 'id' },
			{ dcl: 'SET PASSWORD', unix: 'passwd' },
			{ dcl: 'SET PROCESS/PRIVILEGES=SYSPRV', unix: 'sudo -s', note: 'Turns on a privilege your account is already authorized to hold. No password prompt.' },
			{ dcl: 'MCR AUTHORIZE ADD JDOE/...', unix: 'useradd jdoe', note: 'See the Users section of the cheat sheet for the full ADD command.' },
			{ dcl: 'MCR AUTHORIZE MODIFY JDOE/FLAGS=DISUSER', unix: 'usermod -L jdoe' },
			{ dcl: 'MCR AUTHORIZE REMOVE JDOE', unix: 'userdel jdoe' },
			{ dcl: 'SHOW QUOTA', unix: 'quota' },
			{ dcl: 'LOGOUT', unix: 'exit' }
		]
	},
	{
		id: 'system',
		title: 'System Information and Admin',
		rows: [
			{ dcl: 'SHOW TIME', unix: 'date' },
			{ dcl: 'SHOW SYSTEM/NOPROCESS', unix: 'uptime', note: 'The header line includes the uptime.' },
			{ dcl: 'WRITE SYS$OUTPUT F$GETSYI("VERSION")', unix: 'uname -r' },
			{ dcl: 'WRITE SYS$OUTPUT F$GETSYI("NODENAME")', unix: 'hostname' },
			{ dcl: 'SHOW MEMORY', unix: 'free -h', note: 'On macOS: `vm_stat`.' },
			{ dcl: 'SHOW CPU', unix: 'lscpu', note: 'On macOS: `sysctl -n machdep.cpu.brand_string`.' },
			{ dcl: 'SHOW DEVICES/FULL DKA0:', unix: 'lsblk', note: 'On macOS: `diskutil info disk0`.' },
			{ dcl: 'TYPE SYS$MANAGER:OPERATOR.LOG', unix: 'journalctl', note: 'System messages. On macOS: `log show`.' },
			{ dcl: 'SHOW ERROR', unix: 'dmesg', note: 'Device error counts rather than a kernel log.' },
			{ dcl: 'PRODUCT SHOW PRODUCT', unix: 'dpkg -l', note: 'Installed software. Elsewhere: `rpm -qa`, `brew list`.' },
			{ dcl: 'PRODUCT INSTALL OPENSSH', unix: 'apt install openssh-server', note: 'PCSI kits are installed from files in the current directory, not a remote repository.' },
			{ dcl: 'PRODUCT REMOVE OPENSSH', unix: 'apt remove openssh-server' },
			{ dcl: 'MOUNT DKA100: DATA', unix: 'mount /dev/sdb1 /mnt/data' },
			{ dcl: 'DISMOUNT DKA100:', unix: 'umount /mnt/data' },
			{ dcl: 'INITIALIZE DKA100: DATA', unix: 'mkfs /dev/sdb1', note: 'Erases the disk.' },
			{ dcl: 'ANALYZE/DISK_STRUCTURE DKA0:', unix: 'fsck /dev/sda1' },
			{ dcl: 'BACKUP [...]*.*;* SAVE.BCK/SAVE_SET', unix: 'tar cf save.tar .' },
			{ dcl: 'BACKUP/LIST SAVE.BCK/SAVE_SET', unix: 'tar tf save.tar' },
			{ dcl: 'BACKUP SAVE.BCK/SAVE_SET [.RESTORE...]', unix: 'tar xf save.tar -C restore', note: 'Restores into a RESTORE subdirectory.' },
			{ dcl: 'REPLY/ALL "Going down in 5 minutes"', unix: 'wall "Going down in 5 minutes"' },
			{ dcl: '@SYS$SYSTEM:SHUTDOWN', unix: 'sudo shutdown -h now', note: 'Interactive: it asks whether to reboot, so it also covers `shutdown -r`.' }
		]
	},
	{
		id: 'net',
		title: 'Networking',
		rows: [
			{ dcl: 'TCPIP SHOW INTERFACE', unix: 'ip addr', note: 'On macOS: `ifconfig`.' },
			{ dcl: 'TCPIP SHOW ROUTE', unix: 'ip route', note: 'On macOS: `netstat -rn`.' },
			{ dcl: 'TCPIP PING example.com', unix: 'ping example.com' },
			{ dcl: 'TCPIP TRACEROUTE example.com', unix: 'traceroute example.com' },
			{ dcl: 'TCPIP SHOW HOST example.com', unix: 'host example.com' },
			{ dcl: 'TCPIP SHOW DEVICE_SOCKET', unix: 'ss -tan', note: 'Open sockets. On macOS: `netstat -an`.' },
			{ dcl: 'TCPIP SHOW SERVICE', unix: 'systemctl list-units --type=service', note: 'Network services and whether they\'re enabled.' },
			{ dcl: 'TCPIP ENABLE SERVICE SSHD22', unix: 'systemctl start sshd' },
			{ dcl: 'TCPIP SET HOST FILESERVER/ADDRESS=192.0.2.10', unix: 'echo "192.0.2.10 fileserver" >> /etc/hosts', note: 'Add a static host name.' },
			{ dcl: 'SSH user@host', unix: 'ssh user@host', note: 'If `SSH` isn\'t recognised, run `@SSH$ROOT:[BIN]SSH$DEFINE_COMMANDS.COM ALL` first.' },
			{ dcl: 'FTP host', unix: 'ftp host' },
			{ dcl: 'TELNET host', unix: 'telnet host' }
		]
	}
];
