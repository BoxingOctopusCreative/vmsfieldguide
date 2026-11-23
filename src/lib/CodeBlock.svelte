<script>
	import { copyText } from './copy.js';
	import { highlight } from './highlight.js';

	/** @type {{ code: string, lang?: string }} */
	let { code, lang = 'shell' } = $props();
	let pre = $state();
	let copied = $state(false);

	async function copy() {
		if (await copyText(code.trim(), pre)) {
			copied = true;
			setTimeout(() => (copied = false), 1200);
		}
	}
</script>

<div class="codeblock">
	<div class="bar">
		<span>{lang}</span>
		<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
	</div>
	<pre bind:this={pre}><code>{@html highlight(code.trim(), lang)}</code></pre>
</div>

<style>
	.codeblock { border: 1px solid var(--rule); border-radius: 10px; background: var(--code-bg); overflow: hidden; min-width: 0; }
	.bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px 6px 14px; border-bottom: 1px solid var(--rule); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
	button { font: inherit; text-transform: none; letter-spacing: 0; font-size: 12px; color: var(--accent); background: var(--surface); border: 1px solid var(--rule); border-radius: 6px; padding: 3px 10px; cursor: pointer; }
	button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
	pre { margin: 0; padding: 12px 14px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
	code { font-family: var(--font-mono); }
</style>
