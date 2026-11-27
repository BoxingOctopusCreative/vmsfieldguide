<script>
	// EVE, the full-screen editor (EDIT/TPU), drawn inside the DCL terminal.
	// The shell hands over the file's text and gets back { action: 'exit' | 'quit', text }.
	import { onMount, tick, untrack } from 'svelte';
	import { matchAbbrev } from './dcl/parse.js';

	/**
	 * @type {{
	 *   opts: { buffer: string, file: string, text: string, isNew: boolean, readOnly: boolean,
	 *           include: (spec: string) => { text?: string, error?: string },
	 *           writeFile: (spec: string, text: string) => string },
	 *   ondone: (result: { action: 'exit' | 'quit', text: string }) => void
	 * }}
	 */
	let { opts, ondone } = $props();

	// The editor is created fresh for each file, so reading opts once is right.
	let text = $state(untrack(() => opts.text));
	let overstrike = $state(false);
	let message = $state('');
	/** The command line at the bottom, when EVE is asking for something. */
	let ask = $state(/** @type {{ prompt: string, resolve: (v: string|null) => void } | null} */ (null));
	let askValue = $state('');
	let lastFind = '';
	let area = $state();
	let askField = $state();

	const original = untrack(() => opts.text);
	const lineCount = (t) => (t === '' ? 0 : t.split('\n').length);
	const modified = $derived(text !== original);

	const COMMANDS = ['EXIT', 'QUIT', 'FIND', 'REPLACE', 'LINE', 'TOP', 'BOTTOM', 'ERASE', 'INCLUDE', 'WRITE', 'SET', 'CHANGE', 'WHAT', 'HELP'].map((name) => ({ name }));

	const HELP = `EVE commands (press F4 or Do, then type one):
  EXIT  QUIT  FIND text  REPLACE old new  LINE n  TOP  BOTTOM  WHAT LINE
  ERASE LINE  INCLUDE FILE name  WRITE FILE name  SET INSERT  SET OVERSTRIKE  CHANGE MODE
Keys: Ctrl-Z exits and saves, Ctrl-A switches insert/overstrike, F4 or Esc is Do.`;

	onMount(async () => {
		message = opts.isNew ? `File not found: ${opts.file}` : `${lineCount(text)} line${lineCount(text) === 1 ? '' : 's'} read from file ${opts.file}`;
		if (opts.readOnly) message += ' (read-only)';
		await tick();
		area?.focus({ preventScroll: true });
		area?.setSelectionRange(0, 0);
	});

	/** Show a prompt on the command line and wait for the answer (null if cancelled). */
	function prompt(p) {
		return new Promise((resolve) => {
			askValue = '';
			ask = { prompt: p, resolve };
			tick().then(() => askField?.focus({ preventScroll: true }));
		});
	}

	function answer(value) {
		const a = ask;
		ask = null;
		a?.resolve(value);
		if (!ask) tick().then(() => area?.focus({ preventScroll: true }));
	}

	/** Do: ask for a command and run it. */
	export async function doKey() {
		if (ask) return;
		const cmd = await prompt('Command: ');
		if (cmd !== null && cmd.trim()) await run(cmd.trim());
	}

	export function exit() {
		if (ask) answer(null);
		ondone({ action: opts.readOnly ? 'quit' : 'exit', text });
	}

	async function quit() {
		if (modified && !opts.readOnly) {
			const a = await prompt('Buffer modifications will not be saved, continue quitting (Y or N)? ');
			if (!a || !/^y/i.test(a.trim())) {
				message = 'Quit cancelled';
				return;
			}
		}
		ondone({ action: 'quit', text });
	}

	const caret = () => area?.selectionEnd ?? 0;
	const lineOf = (pos) => text.slice(0, pos).split('\n').length;
	const lineStart = (n) => {
		let pos = 0;
		for (let i = 1; i < n; i++) {
			const j = text.indexOf('\n', pos);
			if (j < 0) return text.length;
			pos = j + 1;
		}
		return pos;
	};

	async function select(start, end = start) {
		await tick();
		area?.focus({ preventScroll: true });
		area?.setSelectionRange(start, end);
		// Bring the caret into view: blur and refocus makes browsers scroll a textarea to its selection.
		area?.blur();
		area?.focus();
	}

	/** EVE's case rule: a search string in lower case matches any case; capitals match exactly. */
	function finder(s) {
		const exact = s !== s.toLowerCase();
		return (from) => (exact ? text.indexOf(s, from) : text.toLowerCase().indexOf(s.toLowerCase(), from));
	}

	async function run(line) {
		const [word, ...rest] = line.split(/\s+/);
		const arg = line.slice(word.length).trim();
		const { match, ambiguous } = matchAbbrev(word.toUpperCase(), COMMANDS);
		if (!match) {
			message = ambiguous ? `Ambiguous command: ${word}` : `Don't understand command: ${word}`;
			return;
		}
		const second = (rest[0] ?? '').toUpperCase();
		const after = (n) => line.split(/\s+/).slice(n).join(' ');
		switch (match.name) {
			case 'EXIT':
				return exit();
			case 'QUIT':
				return quit();
			case 'FIND': {
				const s = arg || (await prompt('Forward Find: ')) || lastFind;
				if (!s) return;
				lastFind = s;
				const i = finder(s)(caret());
				if (i < 0) message = `Could not find: ${s}`;
				else {
					message = '';
					await select(i, i + s.length);
				}
				return;
			}
			case 'REPLACE': {
				if (opts.readOnly) return void (message = 'Buffer is read-only');
				const parts = arg.match(/^"([^"]*)"\s*"([^"]*)"$|^(\S+)\s+(.*)$/);
				const oldS = parts ? (parts[1] ?? parts[3]) : await prompt('Old String: ');
				if (!oldS) return;
				const newS = parts ? (parts[2] ?? parts[4]) : await prompt('New String: ');
				if (newS === null) return;
				const find = finder(oldS);
				let n = 0;
				let out = '';
				let from = 0;
				for (let i = find(0); i >= 0; i = find(from)) {
					out += text.slice(from, i) + newS;
					from = i + oldS.length;
					n++;
				}
				if (!n) return void (message = `No occurrences of ${oldS} found`);
				text = out + text.slice(from);
				message = `Replaced ${n} occurrence${n === 1 ? '' : 's'}`;
				return;
			}
			case 'LINE': {
				const n = Number(arg || (await prompt('Line number: ')));
				if (!Number.isInteger(n) || n < 1) return void (message = 'Line number must be a positive whole number');
				const total = Math.max(lineCount(text), 1);
				if (n > total) message = `Buffer has only ${total} line${total === 1 ? '' : 's'}`;
				await select(lineStart(Math.min(n, total)));
				return;
			}
			case 'TOP':
				return select(0);
			case 'BOTTOM':
				return select(text.length);
			case 'WHAT':
				message = `You are on line ${lineOf(caret())} out of ${Math.max(lineCount(text), 1)}`;
				return;
			case 'ERASE': {
				if (second && !'LINE'.startsWith(second)) return void (message = `Don't understand command: ${line}`);
				if (opts.readOnly) return void (message = 'Buffer is read-only');
				const n = lineOf(caret());
				const start = lineStart(n);
				const nl = text.indexOf('\n', start);
				text = nl < 0 ? text.slice(0, Math.max(0, start - 1)) : text.slice(0, start) + text.slice(nl + 1);
				return select(Math.min(start, text.length));
			}
			case 'INCLUDE': {
				if (opts.readOnly) return void (message = 'Buffer is read-only');
				const spec = (second && 'FILE'.startsWith(second) ? after(2) : arg) || (await prompt('File to include: '));
				if (!spec) return;
				const got = opts.include(spec);
				if (got.error) return void (message = got.error);
				const pos = lineStart(lineOf(caret()));
				const add = got.text ? `${got.text}\n` : '';
				text = text.slice(0, pos) + add + text.slice(pos);
				message = `${lineCount(got.text ?? '')} lines read from file ${spec.toUpperCase()}`;
				return select(pos);
			}
			case 'WRITE': {
				const spec = (second && 'FILE'.startsWith(second) ? after(2) : arg) || (await prompt('File to write: '));
				if (spec) message = opts.writeFile(spec, text);
				return;
			}
			case 'SET':
				if ('OVERSTRIKE'.startsWith(second) && second) overstrike = true;
				else if ('INSERT'.startsWith(second) && second) overstrike = false;
				else message = `Don't understand command: ${line}`;
				return;
			case 'CHANGE':
				overstrike = !overstrike;
				return;
			case 'HELP':
				message = HELP;
				return;
		}
	}

	function onkeydown(e) {
		const k = e.key;
		if (e.ctrlKey && !e.metaKey && k.toLowerCase() === 'z') {
			e.preventDefault();
			exit();
		} else if (k === 'F4' || (k === 'Escape' && !ask)) {
			e.preventDefault();
			doKey();
		} else if (e.ctrlKey && !e.metaKey && k.toLowerCase() === 'a') {
			e.preventDefault();
			overstrike = !overstrike;
		} else if (e.ctrlKey && !e.metaKey && k.toLowerCase() === 'e') {
			e.preventDefault();
			const n = lineOf(caret());
			const nl = text.indexOf('\n', lineStart(n));
			select(nl < 0 ? text.length : nl);
		}
	}

	/** Overstrike: typed characters replace the ones under the cursor, up to the end of the line. */
	function onbeforeinput(e) {
		if (!overstrike || e.inputType !== 'insertText' || !e.data || area.selectionStart !== area.selectionEnd) return;
		const pos = area.selectionStart;
		const nl = text.indexOf('\n', pos);
		const lineEnd = nl < 0 ? text.length : nl;
		const cut = Math.min(e.data.length, lineEnd - pos);
		e.preventDefault();
		text = text.slice(0, pos) + e.data + text.slice(pos + cut);
		const to = pos + e.data.length;
		tick().then(() => area.setSelectionRange(to, to));
	}

	function onaskkey(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			answer(askValue);
		} else if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
			e.preventDefault();
			answer(null);
		}
	}
</script>

<div class="eve">
	<textarea
		bind:this={area}
		bind:value={text}
		{onkeydown}
		{onbeforeinput}
		readonly={opts.readOnly}
		spellcheck="false"
		autocapitalize="off"
		autocomplete="off"
		wrap="off"
		aria-label="Editing {opts.buffer} in EVE. Ctrl-Z saves and exits; F4 or Escape for commands."
	></textarea>
	<div class="status" role="status">
		<span>Buffer: {opts.buffer}</span>
		<span>{opts.readOnly ? 'Read-only' : 'Write'} | {overstrike ? 'Overstrike' : 'Insert'} | Forward</span>
	</div>
	<div class="message" aria-live="polite">{message}</div>
	<div class="ask">
		{#if ask}
			<span>{ask.prompt}</span><input bind:this={askField} bind:value={askValue} onkeydown={onaskkey} autocomplete="off" autocapitalize="off" spellcheck="false" aria-label={ask.prompt.trim()} />
		{/if}
	</div>
</div>

<style>
	.eve {
		display: flex;
		flex-direction: column;
		height: clamp(340px, 60vh, 560px);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.45;
		color: var(--t-fg);
		background: var(--t-bg);
	}
	textarea {
		flex: 1;
		min-height: 0;
		resize: none;
		border: 0;
		margin: 0;
		padding: 12px 14px;
		background: transparent;
		color: inherit;
		font: inherit;
		white-space: pre;
		overflow: auto;
		caret-color: var(--t-prompt);
		outline: none;
		box-shadow: none;
	}
	textarea:focus {
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--t-prompt) 45%, transparent);
	}
	.status {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 0 14px;
		background: var(--t-fg);
		color: var(--t-bg);
		white-space: pre;
		overflow: hidden;
	}
	.message {
		min-height: 1.45em;
		max-height: 6.5em;
		overflow: auto;
		padding: 0 14px;
		white-space: pre-wrap;
		color: var(--t-info);
	}
	.ask {
		display: flex;
		min-height: 1.45em;
		padding: 0 14px 6px;
		white-space: pre;
	}
	.ask input {
		flex: 1;
		min-width: 4ch;
		background: transparent;
		border: 0;
		padding: 0;
		color: var(--t-fg);
		font: inherit;
		outline: none;
		box-shadow: none;
	}
</style>
