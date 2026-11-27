<script>
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { ThemeProvider, Navbar, NavBrand, Button, Dropdown, DropdownItem, Footer } from 'flowbite-svelte';
	import { SquareTerminal, Menu, X, BookOpen, ArrowLeftRight, Landmark, CircleHelp, Download, Laptop, Monitor, Terminal } from '@lucide/svelte';
	import ThemeToggle from '#lib/ThemeToggle.svelte';
	import { theme } from '#lib/flowbite-theme.js';

	let { children } = $props();
	let menuOpen = $state(false);

	// Prerendered with the build year, then corrected in the browser so it's always the current year.
	let year = $state(new Date().getFullYear());
	onMount(() => (year = new Date().getFullYear()));

	const links = [
		{ href: resolve('/'), label: 'Cheat Sheet', icon: BookOpen },
		{ href: resolve('/compare'), label: 'VMS vs. Unix', icon: ArrowLeftRight },
		{ href: resolve('/dcl'), label: 'Try (Simulated) OpenVMS', icon: Terminal },
		{ href: resolve('/history'), label: 'What Is OpenVMS?', icon: Landmark },
		{ href: resolve('/why'), label: 'Why VMS?', icon: CircleHelp },
		{ href: resolve('/get'), label: 'Get OpenVMS', icon: Download },
		{ href: resolve('/qemu'), label: 'Run It on a Mac', icon: Laptop },
		{ href: resolve('/pc'), label: 'Run It on a PC', icon: Monitor }
	];
</script>

<ThemeProvider {theme}>
	<div class="wrap">
		<Navbar fluid class="px-0 py-3 sm:px-0" aria-label="Site">
			<NavBrand href={resolve('/')} class="gap-2 text-fg no-underline">
				<SquareTerminal size={20} class="text-accent" aria-hidden="true" />
				<span class="font-mono text-[13px] font-semibold">OpenVMS Field Notes</span>
			</NavBrand>
			<div class="flex items-center gap-2">
				<ThemeToggle />
				<!-- Every page link lives in this menu, at all screen sizes. -->
				<Button color="alternative" size="xs" class="p-2" aria-label="Menu" title="Menu" aria-haspopup="menu" aria-expanded={menuOpen}>
					{#if menuOpen}<X size={18} aria-hidden="true" />{:else}<Menu size={18} aria-hidden="true" />{/if}
				</Button>
				<Dropdown bind:isOpen={menuOpen} simple placement="bottom-end" activeUrl={page.url.pathname} class="z-50 w-56">
					{#each links as link (link.href)}
						<DropdownItem href={link.href} class="flex items-center gap-2" classes={{ active: 'flex items-center gap-2 font-semibold' }} onclick={() => (menuOpen = false)}>
							<link.icon size={15} aria-hidden="true" />
							{link.label}
						</DropdownItem>
					{/each}
				</Dropdown>
			</div>
		</Navbar>

		{@render children()}

		<Footer class="mt-4 rounded-none border-t border-gray-200 bg-transparent px-0 py-3.5 text-xs text-muted shadow-none md:block md:px-0 md:py-3.5 dark:border-gray-700 dark:bg-transparent">
			A <a href="https://boxingoctop.us" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">Boxing Octopus Creative</a> Project.
			Copyright {year} All rights reserved.
			<span class="mx-1.5" aria-hidden="true">|</span>
			OpenVMS and the OpenVMS logo are trademarks of <a href="https://vmssoftware.com" target="_blank" rel="noopener" class="text-accent underline underline-offset-2">VMS Software, Inc.</a> This is an unofficial fan reference.
		</Footer>
	</div>
</ThemeProvider>
