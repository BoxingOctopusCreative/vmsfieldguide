<script>
	/** Sticky search bar + section links. Publishes its height as --sticky-h so section anchors land below it. */
	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();
	let h = $state(0);

	// No cleanup: on client-side navigation the next page's bar sets it before this one is destroyed.
	$effect(() => {
		if (h) document.documentElement.style.setProperty('--sticky-h', `${h}px`);
	});
</script>

<div class="sticky-bar" bind:clientHeight={h}>
	{@render children()}
</div>
