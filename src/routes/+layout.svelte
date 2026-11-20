<script>
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();

	const links = [
		{ href: resolve('/'), label: 'Cheat sheet' },
		{ href: resolve('/qemu'), label: 'Run it on a Mac' }
	];
</script>

<div class="wrap">
	<nav class="site-nav" aria-label="Site">
		<a class="brand" href={resolve('/')}>$ OpenVMS Field Notes</a>
		{#each links as link (link.href)}
			<a class="link" href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
		{/each}
	</nav>

	{@render children()}
</div>
