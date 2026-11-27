<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import Callout from '#lib/Callout.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import DclTerminal from '#lib/DclTerminal.svelte';
	import { resolve } from '$app/paths';
	import { Card } from 'flowbite-svelte';
	import { CircleCheck, CircleX, FolderOpen, History, FolderTree, Variable, ScrollText, Play, FilePen } from '@lucide/svelte';

	/** @type {DclTerminal} */
	let term = $state();

	// Each command runs in the simulator when clicked.
	const tryIt = [
		{
			icon: FolderOpen,
			title: 'Look Around',
			items: [
				['DIRECTORY', 'every file here, every version'],
				['TYPE README.TXT', 'show a file'],
				['DIRECTORY/SIZE/DATE', 'sizes in 512-byte blocks, and dates'],
				['SHOW DEFAULT', 'where you are'],
				['SHOW SYSTEM', 'the processes (made up)']
			]
		},
		{
			icon: History,
			title: 'File Versions',
			items: [
				['TYPE NOTES.TXT;1', 'an older version'],
				['DIFFERENCES NOTES.TXT', 'what changed in the newest'],
				['DELETE NOTES.TXT', 'refused: no version given'],
				['PURGE/LOG', 'keep only the newest'],
				['COPY README.TXT README.TXT', 'a copy is a new version']
			]
		},
		{
			icon: FilePen,
			title: 'Editors',
			items: [
				['EDIT NOTES.TXT', 'EVE, full screen; Ctrl-Z saves'],
				['EDIT/EDT NOTES.TXT', 'EDT in line mode; try T WHOLE, then EX'],
				['EDIT SHOPPING.TXT', 'a new file, created when you save'],
				['DIRECTORY NOTES.TXT', 'every save is a new version']
			]
		},
		{
			icon: FolderTree,
			title: 'Directories',
			items: [
				['SET DEFAULT [.PROJECTS]', 'go into a subdirectory'],
				['SET DEFAULT [-]', 'back up one level'],
				['DIRECTORY [...]', 'this directory and everything below'],
				['CREATE/DIRECTORY [.SCRATCH]', 'make one'],
				['HOME', 'a symbol from LOGIN.COM']
			]
		},
		{
			icon: Variable,
			title: 'Symbols and Logical Names',
			items: [
				['X = 6 * 7', 'a symbol (a variable)'],
				['WRITE SYS$OUTPUT "X is ", X', 'use it in an expression'],
				['LS :== DIRECTORY/COLUMNS=2', 'a symbol as a command; then type LS'],
				['DEFINE WORK DISK$USER:[DEMO.PROJECTS]', 'a logical name'],
				['DIRECTORY WORK:', 'use it like a device']
			]
		},
		{
			icon: ScrollText,
			title: 'Command Procedures',
			items: [
				['TYPE [.PROJECTS]COUNT.COM', 'a loop and a block IF'],
				['@[.PROJECTS]COUNT 6', 'run it with a parameter'],
				['@[.PROJECTS]HELLO "Ada"', 'quotes keep the case'],
				['@[.PROJECTS]ASK', 'INQUIRE asks you a question'],
				['WRITE SYS$OUTPUT F$TIME()', 'a lexical function']
			]
		}
	];

	const keys = [
		['Return', 'Run the command'],
		['↑ / ↓', 'Earlier commands'],
		['Ctrl-Z', 'End input (CREATE), or save and leave EVE'],
		['F4 / Esc', 'EVE’s Do key: a Command: prompt'],
		['Ctrl-A', 'EVE: switch insert and overstrike'],
		['Ctrl-Y', 'Interrupt a running command'],
		['Ctrl-U', 'Clear the line']
	];

	const covers = [
		'Booting: the UEFI firmware, the OpenVMS Boot Manager’s <code>BOOTMGR&gt;</code> prompt (<code>BOOT</code>, <code>DEVICES</code>, <code>FLAGS</code>, <code>HELP</code>, <code>SHELL</code>), a conversational boot’s <code>SYSBOOT&gt;</code> prompt (<code>BOOT DKA0 0 1</code>), and the startup messages',
		'The login sequence: <code>Username:</code>, an unechoed <code>Password:</code> and the welcome messages',
		'Both editors: EVE (<code>EDIT/TPU</code>) full screen with its Do-key commands, and EDT (<code>EDIT/EDT</code>) in line mode. Plain <code>EDIT</code> opens EVE, set up in <code>LOGIN.COM</code> as many real sites do',
		'About 30 commands, including <code>DIRECTORY</code>, <code>TYPE</code>, <code>CREATE</code>, <code>COPY</code>, <code>RENAME</code>, <code>DELETE</code>, <code>PURGE</code>, <code>SEARCH</code>, <code>DIFFERENCES</code>, <code>SET</code>, <code>SHOW</code> and <code>HELP</code>',
		'Abbreviations (<code>DIR</code>, <code>SH DEF</code>), qualifiers such as <code>/SIZE</code>, <code>/LOG</code> and <code>/NOLOG</code>, and comma lists',
		'File specs: <code>[DIR.SUB]</code>, <code>[-]</code>, <code>[.SUB]</code> and <code>[...]</code>, wildcards <code>*</code> and <code>%</code>, and version numbers',
		'File versions: every write makes a new one, <code>DELETE</code> needs a version, <code>PURGE</code> clears the old ones',
		'File and directory protection, such as having to allow yourself to delete a directory',
		'Symbols (<code>=</code>, <code>==</code>, <code>:=</code>), apostrophe substitution, and symbols used as commands',
		'Logical names: <code>DEFINE</code>, <code>ASSIGN</code>, <code>DEASSIGN</code> and <code>SHOW LOGICAL</code>, used in file specs',
		'Command procedures: <code>P1</code>–<code>P8</code>, labels, <code>GOTO</code>, <code>GOSUB</code>, <code>IF</code>, block <code>IF</code>, <code>ON ERROR</code>, <code>INQUIRE</code> and <code>EXIT</code>',
		'About 20 lexical functions, including <code>F$SEARCH</code>, <code>F$PARSE</code>, <code>F$EXTRACT</code> and <code>F$CVTIME</code>',
		'VMS-style messages and <code>$STATUS</code>, prompts for missing parameters, command recall, and Ctrl-Y and Ctrl-Z'
	];

	const limits = [
		'Running programs: <code>RUN</code>, compilers, <code>LINK</code> and images',
		'EDT’s keypad (<code>CHANGE</code>) mode, EVE windows and multiple buffers, the numeric keypad layout, and TPU programming',
		'Other accounts: the only one is <code>DEMO</code>, password <code>VMS</code>',
		'A full boot. The real one prints hundreds of lines and takes minutes under emulation; this one is shortened to a few seconds, and most boot manager commands and system parameters are left out',
		'Batch and print queues, subprocesses and other users (<code>SUBMIT</code>, <code>PRINT</code>, <code>SPAWN</code>, <code>MAIL</code>)',
		'Real system information. <code>SHOW SYSTEM</code>, <code>SHOW USERS</code> and the like show made-up output',
		'Accounts, privileges and system management: <code>AUTHORIZE</code>, <code>SYSGEN</code>, <code>SYSMAN</code>, ACLs',
		'RMS indexed and relative files, and <code>OPEN</code>/<code>READ</code>/<code>CLOSE</code> on files. Every file is plain text',
		'Devices other than the one disk, <code>MOUNT</code>, <code>BACKUP</code>, networking and clustering',
		'Block <code>IF</code> at the $ prompt (it works in procedures), <code>&amp;</code> substitution, <code>F$FAO</code> and other lexicals not listed',
		'The full HELP library. <code>HELP</code> here covers only what the simulator knows',
		'Exact output. Formats follow OpenVMS V9.2 closely, but they aren’t identical'
	];
</script>

<Seo
	title="Try (Simulated) OpenVMS"
	description="A simulated OpenVMS system that runs in your browser: boot it, log in, try OpenVMS commands, file versions, the EVE and EDT editors, symbols and command procedures without installing anything."
/>

<Banner eyebrow="Hands On · In Your Browser" title="Try (Simulated) OpenVMS">
	A simulated OpenVMS system you can boot, log in to and type into, editors included. It runs entirely in your browser, with no
	OpenVMS behind it, so nothing you type can break anything. Your files are kept in this browser until you reset the disk.
</Banner>

<SectionLinks links={[['simulator', 'Simulator'], ['try', 'Things to Try'], ['keys', 'Keys'], ['covers', 'What It Covers'], ['limits', 'What It Doesn’t Cover']]} />

<section id="simulator" aria-label="Simulator">
	<DclTerminal bind:this={term} />
	<p class="text-sm text-muted">
		It starts at power-on: type <code>BOOT</code> at the <code>BOOTMGR&gt;</code> prompt, or use Skip boot. Log in as
		<code>DEMO</code>, password <code>VMS</code>. Messages that start with <code>%SIM</code> come from the simulator, not from OpenVMS. For the real thing, see
		<a href={resolve('/get')}>Get OpenVMS</a>.
	</p>
</section>

<section id="try">
	<h2>Things to Try</h2>
	<p class="intro">Click a command to run it in the simulator above (it logs you in as DEMO first if needed), or type your own.</p>
	<div class="notes">
		{#each tryIt as group (group.title)}
			<Card class="gap-2">
				<h3 class="flex items-center gap-2"><group.icon size={18} class="shrink-0 text-accent" aria-hidden="true" />{group.title}</h3>
				<ul class="grid gap-1.5">
					{#each group.items as [cmd, note] (cmd)}
						<li>
							<button type="button" class="try" onclick={() => term?.run(cmd)} title="Run in the simulator">
								<Play size={12} class="mt-1 shrink-0 text-accent" aria-hidden="true" />
								<span class="grid">
									<code>{cmd}</code>
									<span class="text-xs text-muted">{note}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</Card>
		{/each}
	</div>
</section>

<section id="keys">
	<h2>Keys</h2>
	<div class="keys">
		{#each keys as [k, what] (k)}
			<div><kbd>{k}</kbd><span>{what}</span></div>
		{/each}
	</div>
	<Callout title="Writing a File">
		<p>
			<code>EDIT NAME.TXT</code> opens EVE: type, then Ctrl-Z to save. Or type <code>CREATE NAME.TXT</code>, the lines of
			the file, and Ctrl-Z on a line of its own. On a phone, use the Ctrl-Z and Do buttons above the terminal.
		</p>
	</Callout>
</section>

<section id="covers">
	<h2>What It Covers</h2>
	<p class="intro">The parts of DCL a newcomer meets first, which are also what the <a href={resolve('/')}>cheat sheet</a> covers:</p>
	<Card class="max-w-none gap-2">
		<ul class="grid gap-1.5 text-sm">
			{#each covers as c, i (i)}
				<li class="flex items-start gap-2"><CircleCheck size={16} class="mt-0.5 shrink-0 text-accent" aria-hidden="true" /><span>{@html c}</span></li>
			{/each}
		</ul>
	</Card>
</section>

<section id="limits">
	<h2>What It Doesn’t Cover</h2>
	<p class="intro">Everything below DCL itself. Real OpenVMS commands it doesn't model say so with a <code>%SIM</code> message.</p>
	<Card class="max-w-none gap-2">
		<ul class="grid gap-1.5 text-sm">
			{#each limits as l, i (i)}
				<li class="flex items-start gap-2"><CircleX size={16} class="mt-0.5 shrink-0 text-warn" aria-hidden="true" /><span>{@html l}</span></li>
			{/each}
		</ul>
	</Card>
	<Callout kind="info" title="Want the Real Thing?">
		<p>
			VSI's free Community License gets you a real OpenVMS x86-64 system to run in a virtual machine. See
			<a href={resolve('/get')}>Get OpenVMS</a>, then <a href={resolve('/qemu')}>Run It on a Mac</a> or
			<a href={resolve('/pc')}>Run It on a PC</a>.
		</p>
	</Callout>
</section>

<footer class="page-footer">
	The simulator was written for this site and is modelled on OpenVMS V9.2-3. The boot screens follow a real V9.2-3 boot
	under QEMU, shortened. Where it differs from a real system, the real
	system is right.
</footer>

<style>
	.try {
		display: flex;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 4px 6px;
		margin-inline: -6px;
		border-radius: 6px;
		cursor: pointer;
	}
	.try:hover,
	.try:focus-visible {
		background: var(--code-bg);
	}
	.try:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	.try code {
		background: none;
		padding: 0;
		font-size: 13px;
		color: var(--fg);
		overflow-wrap: anywhere;
	}
</style>
