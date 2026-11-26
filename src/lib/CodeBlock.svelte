<script>
	import { Button } from 'flowbite-svelte';
	import { Copy, Check } from '@lucide/svelte';
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

<div class="min-w-0 overflow-hidden rounded-lg border border-rule bg-code">
	<div class="flex items-center justify-between border-b border-rule py-1.5 pr-2 pl-3.5 font-mono text-[11px] tracking-wider text-muted uppercase">
		<span>{lang}</span>
		<Button color="alternative" size="xs" class="gap-1.5 px-2.5 py-1 normal-case" onclick={copy} aria-live="polite">
			{#if copied}<Check size={14} aria-hidden="true" /> Copied{:else}<Copy size={14} aria-hidden="true" /> Copy{/if}
		</Button>
	</div>
	<pre bind:this={pre} class="m-0 overflow-x-auto px-3.5 py-3 text-[13px] leading-normal"><code class="font-mono">{@html highlight(code.trim(), lang)}</code></pre>
</div>
