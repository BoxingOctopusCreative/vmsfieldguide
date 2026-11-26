<script>
	import { onMount } from 'svelte';
	import { Button } from 'flowbite-svelte';
	import { Sun, Moon } from '@lucide/svelte';

	// Follows the system setting until the user picks a theme; the choice is then remembered.
	/** @type {'light' | 'dark'} */
	let theme = $state('light');

	onMount(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const saved = document.documentElement.dataset.theme;
		theme = saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light';

		const onSystemChange = (/** @type {MediaQueryListEvent} */ e) => {
			if (!document.documentElement.dataset.theme) theme = e.matches ? 'dark' : 'light';
		};
		media.addEventListener('change', onSystemChange);
		return () => media.removeEventListener('change', onSystemChange);
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Storage blocked (private mode etc.): the toggle still works for this page view.
		}
	}

	let label = $derived(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
</script>

<!-- Both icons render; the dark: variant picks one from the page theme, so it's right before hydration. -->
<Button color="alternative" size="xs" class="p-2" onclick={toggle} aria-label={label} title={label}>
	<Sun size={18} aria-hidden="true" class="hidden dark:block" />
	<Moon size={18} aria-hidden="true" class="block dark:hidden" />
</Button>
