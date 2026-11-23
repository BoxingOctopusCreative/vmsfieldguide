<script>
	import { onMount } from 'svelte';

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

<button type="button" class="theme-toggle" onclick={toggle} aria-label={label} title={label}>
	<!-- Both icons render; CSS picks one from the page theme so it's right before hydration. -->
	<svg class="sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
		<circle cx="12" cy="12" r="4.5" />
		<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
	</svg>
	<svg class="moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
		<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
	</svg>
</button>

<style>
	.theme-toggle {
		display: inline-grid;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: 1px solid var(--rule);
		border-radius: 8px;
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
	}
	.theme-toggle:hover {
		color: var(--fg);
	}
	.sun {
		display: none;
	}
	:global(:root[data-theme='dark']) .sun {
		display: block;
	}
	:global(:root[data-theme='dark']) .moon {
		display: none;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .sun {
			display: block;
		}
		:global(:root:not([data-theme='light'])) .moon {
			display: none;
		}
	}
	.theme-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
