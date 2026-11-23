<script>
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ThemeToggle from '#lib/ThemeToggle.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Prerendered with the build year, then corrected in the browser so it's always the current year.
	let year = $state(new Date().getFullYear());
	onMount(() => (year = new Date().getFullYear()));

	const links = [
		{ href: resolve('/'), label: 'Cheat Sheet' },
		{ href: resolve('/compare'), label: 'VMS vs. Unix' },
		{ href: resolve('/why'), label: 'Why VMS?' },
		{ href: resolve('/qemu'), label: 'Run It on a Mac' },
		{ href: resolve('/pc'), label: 'Run It on a PC' }
	];
</script>

<div class="wrap">
	<nav class="site-nav" aria-label="Site">
		<a class="brand" href={resolve('/')}>$ OpenVMS Field Notes</a>
		<div class="links">
			{#each links as link (link.href)}
				<a class="link" href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
			{/each}
		</div>
		<ThemeToggle />
	</nav>

	{@render children()}

	<p class="site-credit">
		A <a href="https://boxingoctop.us" target="_blank" rel="noopener">Boxing Octopus Creative</a> Project.
		Copyright {year} All rights reserved.
	</p>
</div>
