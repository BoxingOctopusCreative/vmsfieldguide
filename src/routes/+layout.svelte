<script>
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { ThemeProvider, Navbar, NavBrand, NavHamburger, NavUl, NavLi, Footer } from 'flowbite-svelte';
	import { SquareTerminal, BookOpen, ArrowLeftRight, CircleHelp, Laptop, Monitor } from '@lucide/svelte';
	import ThemeToggle from '#lib/ThemeToggle.svelte';
	import { theme } from '#lib/flowbite-theme.js';

	let { children } = $props();

	// Prerendered with the build year, then corrected in the browser so it's always the current year.
	let year = $state(new Date().getFullYear());
	onMount(() => (year = new Date().getFullYear()));

	const links = [
		{ href: resolve('/'), label: 'Cheat Sheet', icon: BookOpen },
		{ href: resolve('/compare'), label: 'VMS vs. Unix', icon: ArrowLeftRight },
		{ href: resolve('/why'), label: 'Why VMS?', icon: CircleHelp },
		{ href: resolve('/qemu'), label: 'Run It on a Mac', icon: Laptop },
		{ href: resolve('/pc'), label: 'Run It on a PC', icon: Monitor }
	];
</script>

<ThemeProvider {theme}>
	<div class="wrap">
		<Navbar fluid breakpoint="lg" class="px-0 py-3 sm:px-0" aria-label="Site">
			<NavBrand href={resolve('/')} class="gap-2 text-fg no-underline">
				<SquareTerminal size={20} class="text-accent" aria-hidden="true" />
				<span class="font-mono text-[13px] font-semibold">OpenVMS Field Notes</span>
			</NavBrand>
			<div class="flex items-center gap-2 lg:order-2">
				<ThemeToggle />
				<NavHamburger class="m-0" />
			</div>
			<NavUl activeUrl={page.url.pathname} class="lg:order-1" classes={{ ul: 'lg:gap-1 lg:p-0' }}>
				{#each links as link (link.href)}
					<NavLi href={link.href} class="flex items-center gap-1.5 lg:px-2">
						<link.icon size={15} aria-hidden="true" />
						{link.label}
					</NavLi>
				{/each}
			</NavUl>
		</Navbar>

		{@render children()}

		<Footer class="mt-4 rounded-none border-t border-gray-200 bg-transparent px-0 py-3.5 text-xs text-muted shadow-none md:block md:px-0 md:py-3.5 dark:border-gray-700 dark:bg-transparent">
			A <a href="https://boxingoctop.us" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">Boxing Octopus Creative</a> Project.
			Copyright {year} All rights reserved.
		</Footer>
	</div>
</ThemeProvider>
