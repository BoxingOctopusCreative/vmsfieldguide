<script>
	// A terminal for the OpenVMS simulator (src/lib/dcl): the boot, a login screen, the $ prompt, and EVE when
	// EDIT/TPU runs. The disk and command history are kept in localStorage, so a visitor's files
	// are still there next time. Passwords are never stored or sent anywhere.
	import { onMount, tick } from 'svelte';
	import { Button } from 'flowbite-svelte';
	import { RotateCcw, Eraser, FastForward } from '@lucide/svelte';
	import { Shell } from './dcl/shell.js';
	import { seedDisk } from './dcl/seed.js';
	import { vmsTime } from './dcl/time.js';
	import { USER, PASSWORD, NODE, VERSION } from './dcl/system.js';
	import EveEditor from './EveEditor.svelte';
	import { runBoot } from './dcl/boot.js';

	const STORE = 'vmsfieldguide:dcl:v1';
	const SKIP_ONCE = 'vmsfieldguide:dcl:skip-boot';
	const MAX_LINES = 1500;

	/** @typedef {{ id: number, text: string, kind: string, prompt?: string, ctl?: string }} Line */
	/** @type {Line[]} */
	let lines = $state.raw([]);
	let input = $state('');
	let promptText = $state('');
	/** True while a command runs and isn't waiting for input. */
	let busy = $state(true);
	let ended = $state(false);
	let ready = $state(false);
	/** 'boot' (firmware, BOOTMGR>, startup), then 'login', then 'shell'. */
	let phase = $state('boot');
	/** Skip ahead: the boot's pauses end at once and its prompts answer themselves. */
	let skipBoot = $state(false);
	/** Every pause in the boot is this fraction of what boot.js asks for. */
	const BOOT_SPEED = 0.5;
	/** True while the Password: prompt is up: what's typed isn't shown, as on VMS. */
	let secret = $state(false);
	/** EVE's open file, while EDIT/TPU runs. */
	let editing = $state.raw(null);
	let eve = $state();
	/** A "Try it" command clicked before logging in: boot, log in as DEMO, then run it. */
	let quickCommand = $state(null);

	let screen = $state();
	let field = $state();
	/** @type {Shell} */
	let shell;
	/** Resolves a pending readLine (CREATE, INQUIRE, HELP's "Topic?" prompt, ...). */
	/** @type {((value: string|null) => void) | null} */
	let pending = $state.raw(null);
	let histIndex = -1;
	let draft = '';
	let nextId = 0;
	/** @type {Line[]} */
	let queued = [];
	let flushing = false;

	function push(line) {
		queued.push({ id: nextId++, ...line });
		if (flushing) return;
		flushing = true;
		queueMicrotask(async () => {
			flushing = false;
			const all = lines.concat(queued);
			queued = [];
			lines = all.length > MAX_LINES ? all.slice(-MAX_LINES) : all;
			await tick();
			if (screen) screen.scrollTop = screen.scrollHeight;
		});
	}

	function write(text, kind = 'out') {
		for (const t of String(text).split('\n')) push({ text: t, kind });
	}

	/** What a skipped boot or a quick login types at each prompt. */
	function autoAnswer(prompt) {
		if (phase === 'boot' && (skipBoot || quickCommand)) {
			return { 'BOOTMGR> ': 'BOOT', 'SYSBOOT> ': 'CONTINUE', 'Shell> ': 'fs0:\\EFI\\VMS\\VMS_BOOTMGR.EFI', '': '' }[prompt];
		}
		if (phase === 'login' && quickCommand) return { 'Username: ': USER, 'Password: ': PASSWORD }[prompt];
		return undefined;
	}

	const io = {
		write,
		clear: () => {
			lines = [];
			queued = [];
		},
		readLine: (prompt) =>
			new Promise((resolve) => {
				const auto = autoAnswer(prompt);
				if (auto !== undefined) {
					push({ text: prompt === 'Password: ' ? '' : auto, prompt, kind: 'echo' });
					resolve(auto);
					return;
				}
				promptText = prompt;
				pending = resolve;
				busy = false;
				focusSoon();
			}),
		editScreen: (opts) =>
			new Promise((resolve) => {
				editing = {
					opts,
					done: (result) => {
						editing = null;
						resolve(result);
						tick().then(() => field?.focus({ preventScroll: true }));
					}
				};
			})
	};

	function load() {
		try {
			return JSON.parse(localStorage.getItem(STORE) ?? 'null');
		} catch {
			return null;
		}
	}

	function save() {
		try {
			const old = load() ?? {};
			localStorage.setItem(STORE, JSON.stringify({ disk: shell.disk.toJSON(), history: shell.history.slice(0, 100), lastLogin: old.lastLogin }));
		} catch {
			// Storage full or blocked: the session still works, it just won't be remembered.
		}
	}

	/** Power on: the boot sequence, then the login screen. */
	async function boot({ fresh = false } = {}) {
		const saved = fresh ? null : load();
		shell = new Shell({ io, disk: saved?.disk ?? seedDisk() });
		busy = true;
		phase = 'boot';
		write('OpenVMS Field Notes · Simulated OpenVMS', 'banner');
		write('A simulation of OpenVMS, running in your browser. No OpenVMS software is involved.', 'banner');
		write('');
		await runBoot(io, {
			sleep: (ms) => (skipBoot || quickCommand ? Promise.resolve() : new Promise((r) => setTimeout(r, ms * BOOT_SPEED)))
		});
		skipBoot = false;
		await login(saved);
	}

	/** The login screen: Username and Password, then the welcome text and LOGIN.COM. */
	async function login(saved = load()) {
		busy = true;
		phase = 'login';
		write(` Welcome to OpenVMS (TM) x86_64 Operating System, Version ${VERSION}`);
		write('');
		write(`Log in as ${USER}, password ${PASSWORD}. Nothing you type here leaves your browser.`, 'banner');
		write('');

		// As on a real terminal. Like VMS passwords, the check ignores case.
		// The password is compared and dropped; it's never stored.
		for (;;) {
			const user = await io.readLine('Username: ');
			if (user === null || !user.trim()) continue;
			secret = true;
			const password = await io.readLine('Password: ');
			secret = false;
			if (user.trim().toUpperCase() === USER && (password ?? '').trim().toUpperCase() === PASSWORD) break;
			quickCommand = null;
			write('User authorization failure');
			write('');
		}
		busy = true;
		write('');
		write(`    Welcome to OpenVMS (TM) x86_64 Operating System, Version ${VERSION} on node ${NODE}`);
		if (saved?.lastLogin) write(`    Last interactive login on ${new Date(saved.lastLogin).toLocaleDateString('en-US', { weekday: 'long' })}, ${vmsTime(saved.lastLogin).trim()}`);
		write('');
		write('Type HELP for the commands this simulator knows.', 'banner');
		write('');
		phase = 'shell';
		await shell.login();
		shell.history = saved?.history ?? [];
		try {
			localStorage.setItem(STORE, JSON.stringify({ disk: shell.disk.toJSON(), history: shell.history, lastLogin: Date.now() }));
		} catch {
			// See save().
		}
		showPrompt();
		if (quickCommand) {
			const c = quickCommand;
			quickCommand = null;
			input = c;
			await submit();
		}
	}

	function showPrompt() {
		if (shell.loggedOut) {
			ended = true;
			write('');
			write('Session ended. Press Return to log in again.', 'banner');
			promptText = '';
		} else {
			promptText = shell.prompt;
		}
		if (shell.prefill) {
			input = shell.prefill;
			shell.prefill = null;
		}
		busy = false;
		focusSoon();
	}

	async function submit() {
		const value = input;
		input = '';
		if (pending) {
			push({ text: secret ? '' : value, prompt: promptText, kind: 'echo' });
			const resolve = pending;
			pending = null;
			busy = true;
			resolve(value);
			return;
		}
		if (busy) return;
		if (ended) {
			ended = false;
			write('');
			await login();
			return;
		}
		push({ text: value, prompt: promptText, kind: 'echo' });
		busy = true;
		histIndex = -1;
		await shell.command(value);
		save();
		showPrompt();
	}

	/** Ctrl-Y and Ctrl-C stop a command; Ctrl-Z ends input. Each echoes its word in reverse video, as VMS does. */
	function control(key) {
		if (key === 'Z') {
			push({ text: input, prompt: promptText, kind: 'echo', ctl: 'Exit' });
			input = '';
			if (pending) {
				const resolve = pending;
				pending = null;
				busy = true;
				resolve(null);
			}
			return;
		}
		const word = key === 'Y' ? 'Interrupt' : 'Cancel';
		if (phase !== 'shell') {
			input = '';
			return;
		}
		if (pending || busy) {
			push({ text: pending ? input : '', prompt: pending ? promptText : '', kind: 'echo', ctl: word });
			shell.interrupt();
			if (pending) {
				const resolve = pending;
				pending = null;
				resolve(null);
			}
		} else {
			push({ text: input, prompt: promptText, kind: 'echo', ctl: word });
		}
		input = '';
		field?.focus({ preventScroll: true });
	}

	function onkeydown(e) {
		if (e.ctrlKey && !e.altKey && !e.metaKey && ['y', 'c', 'z'].includes(e.key.toLowerCase())) {
			// Leave Ctrl-C alone when text is selected, so copying still works.
			if (e.key.toLowerCase() === 'c' && window.getSelection()?.toString()) return;
			e.preventDefault();
			control(e.key.toUpperCase());
			return;
		}
		if (e.ctrlKey && e.key.toLowerCase() === 'u') {
			e.preventDefault();
			input = '';
			return;
		}
		if (e.target !== field) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		} else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !pending) {
			e.preventDefault();
			const h = shell.history;
			if (e.key === 'ArrowUp' && histIndex < h.length - 1) {
				if (histIndex === -1) draft = input;
				histIndex++;
				input = h[histIndex];
			} else if (e.key === 'ArrowDown' && histIndex >= 0) {
				histIndex--;
				input = histIndex === -1 ? draft : h[histIndex];
			}
		}
	}

	function focusSoon() {
		tick().then(() => {
			if (document.activeElement === field) return;
			// Only take focus if the terminal already had it, so the page doesn't jump on load.
			if (screen?.contains(document.activeElement)) field?.focus({ preventScroll: true });
		});
	}

	function focusField() {
		if (!window.getSelection()?.toString()) field?.focus({ preventScroll: true });
	}

	/** Run a command as if typed: used by the "Try it" buttons on the page. */
	export async function run(command) {
		if (!ready || editing) return;
		screen?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
		// Not logged in yet: finish booting, log in as DEMO (typing the password), then run it.
		if (ended && !busy) {
			ended = false;
			quickCommand = command;
			write('');
			await login();
			return;
		}
		if (phase !== 'shell') {
			if (quickCommand) return;
			quickCommand = command;
			answerPending();
			return;
		}
		if (busy || pending || ended) return;
		input = command;
		field?.focus({ preventScroll: true });
		await submit();
	}

	/** If a boot or login prompt is waiting, answer it the way skipping would. */
	function answerPending() {
		if (!pending) return;
		const a = autoAnswer(promptText);
		if (a === undefined) return;
		input = a;
		submit();
	}

	function skip() {
		skipBoot = true;
		answerPending();
	}

	/** Start over with the demo files: clear the saved disk and power on again, skipping the boot. */
	function resetDisk() {
		try {
			localStorage.removeItem(STORE);
			sessionStorage.setItem(SKIP_ONCE, '1');
		} catch {
			// Storage blocked: the reload still starts from the demo files.
		}
		location.reload();
	}

	function clearScreen() {
		lines = [];
		field?.focus({ preventScroll: true });
	}

	onMount(() => {
		ready = true;
		try {
			skipBoot = sessionStorage.getItem(SKIP_ONCE) === '1';
			sessionStorage.removeItem(SKIP_ONCE);
		} catch {
			// No session storage: boot normally.
		}
		boot();
	});
</script>

<div class="term">
	<div class="term-bar">
		<span class="term-title">Simulated OpenVMS · node FIELD · user DEMO</span>
		<div class="flex flex-wrap items-center gap-1.5">
			{#if phase === 'boot' && !skipBoot && !quickCommand}
				<Button color="alternative" size="xs" class="gap-1.5 px-2 py-1" title="Skip to the login screen" onclick={skip}><FastForward size={14} aria-hidden="true" />Skip boot</Button>
			{/if}
			{#if editing}
				<Button color="alternative" size="xs" class="px-2 py-1 font-mono" title="Do (F4): give EVE a command" onclick={() => eve?.doKey()}>Do</Button>
				<Button color="alternative" size="xs" class="px-2 py-1 font-mono" title="Ctrl-Z: save and leave EVE" onclick={() => eve?.exit()}>Ctrl-Z</Button>
			{:else}
			<Button color="alternative" size="xs" class="px-2 py-1 font-mono" title="Ctrl-Z: end input (finishes CREATE)" onclick={() => control('Z')}>Ctrl-Z</Button>
			<Button color="alternative" size="xs" class="px-2 py-1 font-mono" title="Ctrl-Y: interrupt a command" onclick={() => control('Y')}>Ctrl-Y</Button>
			<Button color="alternative" size="xs" class="gap-1.5 px-2 py-1" title="Clear the screen" onclick={clearScreen}><Eraser size={14} aria-hidden="true" />Clear</Button>
			<Button color="alternative" size="xs" class="gap-1.5 px-2 py-1" title="Put the demo files back and start over" onclick={resetDisk}><RotateCcw size={14} aria-hidden="true" />Reset disk</Button>
			{/if}
		</div>
	</div>
	{#if editing}
		<EveEditor bind:this={eve} opts={editing.opts} ondone={editing.done} />
	{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="term-screen" hidden={!!editing} bind:this={screen} onclick={focusField} {onkeydown}>
		<div role="log" aria-label="Simulator output" aria-live="polite">
			{#each lines as line (line.id)}
				<div class="ln k-{line.kind}">{#if line.prompt !== undefined}<span class="p">{line.prompt}</span>{/if}{line.text}{#if line.ctl}<span class="ctl">{line.ctl}</span>{/if}</div>
			{/each}
		</div>
		<!-- Always present, so Ctrl-Y reaches the terminal while a command runs. -->
		<div class="ln input-line">
			<span class="p" aria-hidden="true">{busy && !pending ? '' : promptText}</span>
			<input bind:this={field} bind:value={input} class:secret autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" aria-label={busy && !pending ? 'Command running; Ctrl-Y stops it' : promptText.trim() || 'DCL command'} />
		</div>
	</div>
</div>

<style>
	/* Always a dark screen, like a VT terminal, in both site themes. */
	.term {
		--t-bg: #0b1019;
		--t-fg: #d8dee9;
		--t-prompt: #86abf0;
		--t-warn: #f2a476;
		--t-info: #9fb3c8;
		--t-sim: #c9b2f2;
		--t-dim: #7d899c;
		border: 1px solid var(--rule);
		border-radius: 10px;
		overflow: hidden;
		background: var(--t-bg);
		min-width: 0;
	}
	.term-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px 6px 14px;
		background: var(--surface);
		border-bottom: 1px solid var(--rule);
	}
	.term-title {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}
	.term-screen {
		height: clamp(340px, 60vh, 560px);
		overflow: auto;
		padding: 12px 14px;
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.45;
		color: var(--t-fg);
		cursor: text;
		resize: vertical;
	}
	.ln {
		white-space: pre;
		min-height: 1.45em;
	}
	.p {
		color: var(--t-prompt);
	}
	.k-msg-w,
	.k-msg-e,
	.k-msg-f {
		color: var(--t-warn);
	}
	.k-msg-i,
	.k-msg-s {
		color: var(--t-info);
	}
	.k-sim {
		color: var(--t-sim);
		white-space: pre-wrap;
	}
	.k-banner,
	.k-verify,
	.k-boot {
		color: var(--t-dim);
		white-space: pre-wrap;
	}
	.ctl {
		background: var(--t-fg);
		color: var(--t-bg);
		padding: 0 4px;
		margin-left: 2px;
	}
	.input-line {
		display: flex;
	}
	.input-line input {
		flex: 1;
		min-width: 4ch;
		background: transparent;
		border: 0;
		padding: 0;
		margin: 0;
		color: var(--t-fg);
		font: inherit;
		caret-color: var(--t-prompt);
		outline: none;
		box-shadow: none;
	}
	/* The password isn't echoed, as on VMS. Plain text styled invisible, so password managers stay out of it. */
	.input-line input.secret {
		color: transparent;
	}
	.term-screen:focus-within {
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--t-prompt) 45%, transparent);
	}
</style>
