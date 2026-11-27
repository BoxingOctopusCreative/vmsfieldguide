// The boot sequence: UEFI firmware, the OpenVMS Boot Manager (BOOTMGR>), an optional conversational
// boot (SYSBOOT>), and the startup messages, ending when the console is ready for a login.
//
// Modelled on a real OpenVMS x86-64 V9.2-3 boot under QEMU, captured from its console, but shortened:
// a real boot prints hundreds of lines and takes minutes under emulation. This one takes seconds.

import { NODE, VERSION } from './system.js';
import { vmsTime } from './time.js';
import { matchAbbrev } from './parse.js';

const BUILD = 'Build 146';

/** SYSGEN parameters a conversational boot can show or change: [current, default, min, max, unit]. */
const PARAMS = {
	STARTUP_P1: ['"    "', '"    "', '"    "', '"zzzz"', 'Ascii'],
	VAXCLUSTER: ['0', '0', '0', '2', 'Coded-value'],
	MAXPROCESSCNT: ['160', '160', '12', '16384', 'Processes'],
	WINDOW_SYSTEM: ['0', '0', '0', '4', 'Coded-value'],
	WRITESYSPARAMS: ['1', '1', '0', '1', 'Boolean'],
	UAFALTERNATE: ['0', '0', '0', '1', 'Boolean']
};

const BOOTMGR_HELP = `BOOT RELATED COMMANDS:

BOOT <device> <sysroot> <bootflags>
     BOOT                - Boots with default device, system root and boot flags.
     BOOT DKA0           - Boots DKA0 with default system root and boot flags.
     BOOT DKA0 0 1       - Boots DKA0 with system root 0 and boot flags 0x1 (conversational).
FLAGS <value>     - Show / Set <value> VMS Boot Flags.  Expressed in hexadecimal.
ROOT <value>      - Show / Set <value> VMS System Root. Expressed in hexadecimal.
DEVICES           - Lists VMS Boot Devices and their UEFI Device aliases.

MESSAGE AND MODE RELATED COMMANDS:

VERBOSE           - Enables Extended boot messages. NOVERB to disable.
CONVERSATIONAL    - Enables SYSBOOT> Conversational boot. NOCON to disable.
OPA0              - Enables the Guest Console OPA0 terminal. NOOPA to disable.

MISCELLANEOUS COMMANDS:

SHELL or EXIT     - Exits to the UEFI Shell.
CLS or CLEAR      - Clears the display.
RESET             - Reset the system.

(The simulator's boot manager knows the commands above. The real one has many more.)`;

const SYSBOOT_HELP = `SYSBOOT commands currently implemented:
     CONTINUE       - Continue with boot process
     EXIT           - Continue with boot process
     SET            - Set parameter value
         SET parameter_name decimal_value
         SET parameter_name "ascii_value"
         SET parameter_name DEFAULT
     SHOW           - Show parameter value(s)
         SHOW parameter_name
              /ALL             Show ALL parameters (the few this simulator has)
If it's not on this list, it probably does not work yet.`;

const BOOTMGR_COMMANDS = ['BOOT', 'DEVICES', 'FLAGS', 'ROOT', 'HELP', 'VERBOSE', 'NOVERBOSE', 'CONVERSATIONAL', 'NOCONVERSATIONAL', 'SYSPROMPT', 'NOSYSPROMPT', 'OPA0', 'NOOPA0', 'SHELL', 'EXIT', 'CLS', 'CLEAR', 'RESET'].map((name) => ({ name, min: 3 }));

/**
 * Run the boot sequence on a console.
 * @param {{ write: (text: string, kind?: string) => void, readLine: (prompt: string) => Promise<string|null>, clear?: () => void }} io
 * @param {{ sleep: (ms: number) => Promise<void> }} opts  sleep returns at once when the visitor skips ahead
 */
export async function runBoot(io, { sleep }) {
	const say = (t = '', kind = 'out') => io.write(t, kind);
	let flags = 0;
	let root = 0;
	let verbose = false;

	firmware();
	await sleep(500);
	for (;;) {
		const r = await bootManager();
		if (r === 'boot') return;
		if (r === 'reset') {
			say('');
			say('Resetting the system...', 'boot');
			await sleep(500);
			firmware();
			continue;
		}
		// SHELL / EXIT: the UEFI shell, until the boot manager is started again.
		say('');
		say('UEFI Interactive Shell v2.2', 'boot');
		say('EDK II', 'boot');
		say('Mapping table', 'boot');
		say('      FS0: Alias(s):HD0a65535a1:;BLK1:', 'boot');
		say('Type  fs0:\\EFI\\VMS\\VMS_BOOTMGR.EFI  to return to the boot manager, or RESET.', 'banner');
		for (;;) {
			const c = ((await io.readLine('Shell> ')) ?? '').trim();
			if (/vms_bootmgr/i.test(c)) break;
			if (/^reset$/i.test(c)) {
				say('Resetting the system...', 'boot');
				await sleep(500);
				firmware();
				break;
			}
			if (/^(help|\?)$/i.test(c)) say('Start the boot manager with  fs0:\\EFI\\VMS\\VMS_BOOTMGR.EFI  or type RESET.', 'boot');
			else if (/^exit$/i.test(c)) say('There is no other boot option. Start the boot manager, or RESET.', 'boot');
			else if (c) say(`'${c.split(/\s+/)[0]}' is not recognized as an internal or external command, operable program, or script file.`, 'boot');
		}
	}

	function firmware() {
		say('BdsDxe: loading Boot0002 "UEFI QEMU HARDDISK QM00013 " from PciRoot(0x0)/Pci(0x2,0x0)/Sata(0x0,0xFFFF,0x0)', 'boot');
		say('BdsDxe: starting Boot0002 "UEFI QEMU HARDDISK QM00013 " from PciRoot(0x0)/Pci(0x2,0x0)/Sata(0x0,0xFFFF,0x0)', 'boot');
	}

	/** The interactive boot manager. Returns 'boot' once OpenVMS has started, 'shell' or 'reset'. */
	async function bootManager() {
		say('');
		say(`Scanning devices and preparing the OpenVMS Boot Manager ${BUILD}...`);
		await sleep(400);
		say('');
		say(`VSI OpenVMS Boot Manager: ${VERSION.replace(/-\d+$/, '-*')} ${BUILD}`);
		say('');
		say('  ENABLED:  Crash Dump Processing');
		say('  ENABLED:  Guest Console OPA0 terminal keyboard & display.');
		say('  ENABLED:  Using Environment ROM');
		say('');
		say('  Checking Required Processor Features:   PASSED');
		say('');
		await sleep(250);
		say('%VMS_BOOTMGR-I-MAP,     Mapping Bootable Devices.');
		say('');
		say('%VMS_BOOTMGR-I-DEVICE,  Identifying System Devices.');
		say('%VMS_BOOTMGR-I-DEVICE,  Scanning PCI/e Busses...');
		await sleep(250);
		say('');
		say('  BOOT MANAGER DEVICE:  DKA0');
		say(`  DEFAULT BOOT COMMAND: BOOT DKA0 ${hex2(root)} ${hex8(flags)}`);
		say('');
		say('  This Guest Console will become the OPA0 terminal when booted.');
		say('');
		say('Type BOOT to start OpenVMS, or HELP for the boot manager\'s commands.', 'banner');
		say('');

		for (;;) {
			const raw = ((await io.readLine('BOOTMGR> ')) ?? '').trim();
			if (!raw) continue;
			const [word, ...args] = raw.toUpperCase().split(/\s+/);
			const { match } = matchAbbrev(word, BOOTMGR_COMMANDS);
			switch (match?.name) {
				case 'HELP':
					say(BOOTMGR_HELP);
					say('');
					break;
				case 'DEVICES':
					say('');
					say('BOOTABLE DEVICES:');
					say(' B = BootMgr Device, V = Default VMS Boot Device.');
					say('');
					say(` BV DKA0        (HD) = FS0    UEFI: V9_2_3       VMS: X86_SYS      8192  MB  SATA Disk`);
					say('');
					break;
				case 'FLAGS':
					if (args[0]) {
						const n = parseInt(args[0].replace(/^0X/, ''), 16);
						if (Number.isNaN(n)) say(`Invalid value: ${args[0]}`);
						else flags = n;
					}
					say(`VMS Boot Flags: ${hex8(flags)}`);
					break;
				case 'ROOT':
					if (args[0]) {
						const n = parseInt(args[0].replace(/^0X/, ''), 16);
						if (Number.isNaN(n) || n > 0xf) say(`Invalid value: ${args[0]}`);
						else if (n !== 0) say(`System root SYS${n.toString(16).toUpperCase()} does not exist on DKA0. The only root here is 0.`);
						else root = n;
					}
					say(`VMS System Root: ${hex2(root)}`);
					break;
				case 'VERBOSE':
				case 'NOVERBOSE':
					verbose = match.name === 'VERBOSE';
					say(`Extended boot messages ${verbose ? 'enabled' : 'disabled'}.`);
					break;
				case 'CONVERSATIONAL':
				case 'SYSPROMPT':
					flags |= 1;
					say(`VMS Boot Flags: ${hex8(flags)}`);
					break;
				case 'NOCONVERSATIONAL':
				case 'NOSYSPROMPT':
					flags &= ~1;
					say(`VMS Boot Flags: ${hex8(flags)}`);
					break;
				case 'OPA0':
				case 'NOOPA0':
					break;
				case 'CLS':
				case 'CLEAR':
					io.clear?.();
					break;
				case 'SHELL':
				case 'EXIT':
					return 'shell';
				case 'RESET':
					return 'reset';
				case 'BOOT': {
					// BOOT [device] [root] [flags]; the device is optional.
					let rest = args;
					let device = 'DKA0';
					if (rest[0] && !/^(0X)?[0-9A-F]+$/.test(rest[0])) {
						device = rest[0].replace(/:$/, '');
						rest = rest.slice(1);
					}
					if (device !== 'DKA0') {
						say(`%VMS_BOOTMGR-E-DEVICE, ${device} is not a bootable device. Type DEVICES for the list.`);
						break;
					}
					const r = rest[0] !== undefined ? parseInt(rest[0].replace(/^0X/, ''), 16) : root;
					if (r !== 0) {
						say(`System root SYS${(Number.isNaN(r) ? rest[0] : r.toString(16)).toUpperCase()} does not exist on DKA0.`);
						break;
					}
					const f = rest[1] !== undefined ? parseInt(rest[1].replace(/^0X/, ''), 16) : flags;
					await startOpenVMS(Number.isNaN(f) ? 0 : f);
					return 'boot';
				}
				default:
					say(`Unrecognized command: ${word}. Type HELP for a list.`);
			}
		}
	}

	async function startOpenVMS(f) {
		say('Booting...');
		say('');
		await sleep(300);
		for (const l of [
			'%VMS_BOOTMGR-I-MAIN,    Updated the environment store.',
			'%VMS_BOOTMGR-I-MAIN,    Allocating Kernel Memory.',
			'%VMS_BOOTMGR-I-SMP,     Enumerating Processors.',
			'%VMS_BOOTMGR-I-MEMDISK, [BLOCKIO] Booting a local system disk.',
			'%VMS_BOOTMGR-I-MEMDISK, Loading DMM0...',
			'%VMS_BOOTMGR-I-MEMDISK, Extracting SYSBOOT from DMM0...',
			'%VMS_BOOTMGR-I-HWRPB,   Initializing Kernel Data Structures.',
			'%VMS_BOOTMGR-I-HWRPB,   Initializing HWRPB for Primary Kernel.',
			'%VMS_BOOTMGR-I-HWRPB,   Configuring System Clocks...'
		]) {
			say(l);
			await sleep(90);
		}
		await sleep(400);
		say('');
		say('%VMS_BOOTMGR-I-HWRPB,   Initializing HWRPB for Dump Kernel.');
		say('');
		say('%VMS_BOOTMGR-I-TRANSFER: Starting VSI OpenVMS');
		say('');
		await sleep(300);
		say('%%%%%%%%%%% VSI OpenVMS (tm) x86-64 Console %%%%%%%%%%%');
		say('');
		const d = new Date();
		const two = (n) => String(n).padStart(2, '0');
		say(`Current date and time: ${two(d.getMonth() + 1)}-${two(d.getDate())}-${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`);
		say('');
		say('VSI Primary Kernel SYSBOOT');

		if (verbose) {
			for (const l of [
				'%SYSBOOT-I-MOUNT, Mounting the boot memory disk',
				'%SYSBOOT-I-MEMDISKMNT, Boot memory disk mounted',
				'%SYSBOOT-I-LOADPARAM, Loading parameter file X86_64VMSSYS.PAR',
				'%SYSBOOT-I-LOADFILE, Loaded file [SYS0.SYSEXE]X86_64VMSSYS.PAR',
				'%SYSBOOT-I-ALLOCMAPBLT, Allocation bitmap built',
				'%SYSBOOT-I-S0PT_CREATED, S0 space page tables created',
				'%SYSBOOT-I-MAP_MD, Boot MemoryDisk remapped to S2 space',
				'%SYSBOOT-I-LOADFILE, Loaded file [VMS$COMMON.SYS$LDR]SYS$BASE_IMAGE.EXE',
				'%SYSBOOT-I-LOADSYSIMGS, Base system images loaded',
				'%SYSBOOT-I-INITDATA, Key system data cells initialized',
				'%SYSBOOT-I-POOLINIT, Created Paged and Nonpaged Pools',
				'%SYSBOOT-I-CREATECPUDB, Created the CPU Database',
				'%SYSBOOT-I-INITGPT, Initialized Global Page Table',
				'%SYSBOOT-I-CREATEPFNDB, Created PFN Database',
				'%SYSBOOT-I-LOADEXEC, Execlets loaded',
				'%SYSBOOT-I-TRANSFER, Transferring to EXEC_INIT',
				'%EXECINIT-I-LDIMGS, loading exec images',
				'%EXECINIT-I-LOADING, loading IO_ROUTINES.EXE',
				'%EXECINIT-I-LOADING, loading PROCESS_MANAGEMENT.EXE',
				'%EXECINIT-I-LOADING, loading LOGICAL_NAMES.EXE',
				'%EXECINIT-I-LOADING, loading F11BXQP.EXE',
				'%EXECINIT-I-LOADING, loading RMS.EXE',
				'%EXECINIT-I-LOADING, loading SECURITY.EXE',
				'%EXECINIT-I-IOCONFIG, configuring the I/O database',
				'%EXECINIT-S-CIAO, transferring to the scheduler',
				'%SWAPPER-I-CREPRC, creating the SYSINIT process',
				'%SYSINIT-I-START, SYSINIT process execution begins',
				'%SYSINIT-I-MOUNT, mounting the system disk',
				'%SYSINIT-I-CREPRC, creating the STARTUP process'
			]) {
				say(l);
				await sleep(40);
			}
		}

		const params = Object.fromEntries(Object.entries(PARAMS).map(([k, v]) => [k, [...v]]));
		if (f & 1) await conversational(params);

		say('');
		say(`        VMS Software, Inc. OpenVMS (TM) x86_64 Operating System, ${VERSION}`);
		say('                    Copyright 2024 VMS Software, Inc.');
		say('');
		await sleep(400);

		const minimal = /MIN/i.test(params.STARTUP_P1[0]);
		const t = (ms) => vmsTime(Date.now() + ms).trim();
		const opcom = (ms, from, ...text) => [
			[0, `%%%%%%%%%%%  OPCOM  ${t(ms)}  %%%%%%%%%%%`, 'opcom'],
			...(from ? [[0, `Message from user ${from} on ${NODE}`, 'opcom']] : []),
			...text.map((x) => [0, x, 'opcom']),
			[0, '']
		];
		/** @type {Array<[number, string, string?]>} */
		const steps = [
			[200, '%DECnet-I-LOADED, network base image loaded, version = 05.92.08'],
			[0, ''],
			[250, `%STDRV-I-STARTUP, OpenVMS startup begun at ${t(0)}`],
			[400, ''],
			...opcom(1200, '', `Operator _${NODE}$OPA0: has been enabled, username SYSTEM`),
			...opcom(1210, '', `Logfile has been initialized by operator _${NODE}$OPA0:`, `Logfile is ${NODE}::SYS$SYSROOT:[SYSMGR]OPERATOR.LOG;1`)
		];
		if (minimal) {
			steps.push([300, '%STARTUP-I-MINIMUM, STARTUP_P1 is "MIN": site startup and layered products were skipped'], [0, '']);
		} else {
			steps.push(
				[300, `%MOUNT-I-MOUNTED, USERDISK mounted on _${NODE}$DKA100:`],
				[300, '%TCPIP-S-STARTDONE, TCPIP$FTP_CLIENT startup completed'],
				...opcom(2400, 'INTERnet', 'INTERnet ACP Activate TELNET Server'),
				[200, '%TCPIP-S-STARTDONE, TCPIP$TELNET startup completed'],
				[200, `%TCPIP-S-STARTDONE, TCP/IP Services startup completed at ${t(2900)}`],
				[0, ''],
				...opcom(3300, 'INTERnet', `%TCPIP-I-FSIPADDRUP, IE0 10.0.2.15 primary active on node ${NODE}, interface IE0`),
				[200, 'Enabling service...'],
				[0, '  Successfully enabled SSHD22 service'],
				[0, ''],
				[200, '        SYSTARTUP_VMS.COM successfully completed']
			);
		}
		steps.push(
			[200, '%SET-I-INTSET, login interactive limit = 64, current interactive value = 0'],
			...opcom(4100, 'SYSTEM', '%SMHANDLER-S-STARTUP, server management event handler startup'),
			[300, `  SYSTEM       job terminated at ${t(4300)}`],
			[0, ''],
			[0, '  Accounting information:'],
			[0, '  Buffered I/O count:            1834         Peak working set size:      4512'],
			[0, '  Direct I/O count:               712         Peak virtual size:        182640'],
			[0, '  Page faults:                   6431         Mounted volumes:               1'],
			[0, '  Charged CPU time:           0 00:00:02.41   Elapsed time:     0 00:00:04.30'],
			[0, '']
		);
		for (const [ms, text, kind] of steps) {
			if (ms) await sleep(ms);
			say(text, kind ?? 'out');
		}
		say('Press Return to log in.', 'banner');
		await io.readLine('');
	}

	/** SYSBOOT>, for a conversational boot (flags bit 0). */
	async function conversational(params) {
		say('');
		say('Conversational boot: SHOW or SET system parameters, then CONTINUE.', 'banner');
		const header = () => {
			say('Parameter Name            Current    Default     Min.       Max.   Unit  Dynamic');
			say('--------------            -------    -------   -------    -------  ----  -------');
		};
		const row = (k) => {
			const [cur, def, min, max, unit] = params[k];
			say(`${k.padEnd(26)}${cur.padStart(7)}${def.padStart(11)}${min.padStart(10)}${max.padStart(11)}  ${unit}`);
		};
		for (;;) {
			say('');
			const raw = ((await io.readLine('SYSBOOT> ')) ?? '').trim();
			if (!raw) continue;
			const m = raw.match(/^(\S+)\s*(\S*)\s*(.*)$/);
			const word = m[1].toUpperCase();
			const name = m[2].toUpperCase();
			const value = m[3].trim();
			if (/^(CON|CONT|CONTI|CONTIN|CONTINU|CONTINUE|EXI|EXIT)$/.test(word)) return;
			if (/^SH(O|OW)?$/.test(word)) {
				const keys = name === '/ALL' || name === '' ? Object.keys(params) : Object.keys(params).filter((k) => k === name);
				if (!keys.length) {
					say(`%SYSBOOT-E-NOPARAM, no such parameter in this simulator: ${name}`);
					continue;
				}
				header();
				keys.forEach(row);
			} else if (/^SE(T)?$/.test(word)) {
				if (!params[name]) say(`%SYSBOOT-E-NOPARAM, no such parameter in this simulator: ${name || '(none)'}`);
				else if (!value) say('%SYSBOOT-E-NOVALUE, a value is required');
				else if (value.toUpperCase() === 'DEFAULT') params[name][0] = params[name][1];
				else if (params[name][4] === 'Ascii') params[name][0] = `"${value.replace(/^"|"$/g, '').toUpperCase().padEnd(4).slice(0, 4)}"`;
				else if (/^\d+$/.test(value)) params[name][0] = value;
				else say(`%SYSBOOT-E-BADVALUE, ${value} is not a decimal value`);
			} else if (/^HE(L|LP)?$/.test(word)) say(SYSBOOT_HELP);
			else say(`%SYSBOOT-E-UNKCMD, unrecognized command ${word}. Type HELP.`);
		}
	}
}

const hex2 = (n) => `0x${(n >>> 0).toString(16).toUpperCase().padStart(2, '0')}`;
const hex8 = (n) => `0x${(n >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
