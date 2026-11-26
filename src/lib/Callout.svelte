<script>
	// A Flowbite Alert in the site's colours, with a Lucide icon.
	//   tip:  practical notes on the setup guides (accent border, lightbulb)
	//   warn: things that can lose work, e.g. shutting down (warning colours, triangle)
	//   info: credits and sources (neutral, info circle)
	import { Alert } from 'flowbite-svelte';
	import { Lightbulb, TriangleAlert, Info } from '@lucide/svelte';

	/** @type {{ kind?: 'tip' | 'warn' | 'info', title?: string, children: import('svelte').Snippet }} */
	let { kind = 'tip', title, children } = $props();

	const styles = {
		tip: 'bg-white dark:bg-gray-800 border-l-4 border-accent text-fg dark:text-fg',
		warn: 'bg-warn-bg dark:bg-warn-bg border-l-4 border-warn text-fg dark:text-fg',
		info: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-fg dark:text-fg'
	};
	const icons = { tip: Lightbulb, warn: TriangleAlert, info: Info };
	const iconColour = { tip: 'text-accent', warn: 'text-warn', info: 'text-muted' };
	const Icon = $derived(icons[kind]);
</script>

<!-- role="note": these are static asides, not live alerts (Flowbite's default role) that screen readers would announce. -->
<Alert color="gray" role="note" class="items-start rounded-lg text-sm {styles[kind]}">
	{#snippet icon()}
		<Icon size={18} class="mt-0.5 shrink-0 {iconColour[kind]}" aria-hidden="true" />
	{/snippet}
	<div class="grid min-w-0 gap-1.5">
		{#if title}<strong class={iconColour[kind]}>{title}</strong>{/if}
		{@render children()}
	</div>
</Alert>
