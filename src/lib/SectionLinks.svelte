<script>
	// Jump links to a page's sections, as small Flowbite buttons.
	import { Button } from 'flowbite-svelte';

	/** @type {{ links: Array<[string, string]>, label?: string }} */
	let { links, label = 'Sections' } = $props();
</script>

<nav class="toc" aria-label={label}>
	{#each links as [id, text] (id)}
		<Button href="#{id}" color="alternative" size="xs" class="shrink-0 px-2.5 py-1 font-normal">{text}</Button>
	{/each}
</nav>
