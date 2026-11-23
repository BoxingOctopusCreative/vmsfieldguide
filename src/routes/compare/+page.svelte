<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import StickyBar from '#lib/StickyBar.svelte';
	import { groups } from '#lib/compare.js';
	import { copyText } from '#lib/copy.js';
	import { highlight } from '#lib/highlight.js';
	import { resolve } from '$app/paths';

	let query = $state('');
	let term = $derived(query.trim().toLowerCase());
	let copiedKey = $state('');

	const total = groups.reduce((n, g) => n + g.rows.length, 0);
	const indexed = groups.map((g) => ({
		...g,
		rows: g.rows.map((r) => ({ ...r, text: `${r.dcl} ${r.unix} ${r.note ?? ''}`.toLowerCase() }))
	}));
	let filtered = $derived(indexed.map((g) => ({ ...g, shown: term ? g.rows.filter((r) => r.text.includes(term)) : g.rows })));
	let shownCount = $derived(filtered.reduce((n, g) => n + g.shown.length, 0));

	/** Escape HTML, then turn `backticks` into <code>. */
	const renderNote = (/** @type {string} */ s) =>
		s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/`([^`]+)`/g, '<code>$1</code>');

	/** Placeholders like "(none)" and key presses aren't worth copying. */
	const copyable = (/** @type {string} */ s) => !s.startsWith('(') && !s.startsWith('Ctrl-');

	/** @param {string} key @param {string} text @param {Event} e */
	async function copy(key, text, e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget).querySelector('code') ?? undefined;
		if (await copyText(text, el)) {
			copiedKey = key;
			setTimeout(() => copiedKey === key && (copiedKey = ''), 1200);
		}
	}

	/** @param {KeyboardEvent} e @param {string} key @param {string} text */
	function onKey(e, key, text) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			copy(key, text, e);
		}
	}
</script>

<Seo title="VMS vs. Unix" description="OpenVMS DCL commands side by side with their closest Unix, Linux and macOS equivalents, with notes on where they differ." />

<Banner eyebrow="DCL ↔ Unix · Linux · macOS" title="VMS vs. Unix">
	DCL commands next to the closest thing on a Unix-like system. Many map one to one; where they don't, the note says what's
	different. Click either command to copy it. For VMS concepts like file versions and logical names, start with the
	<a href={resolve('/')}>cheat sheet</a>.
</Banner>

<StickyBar>
<div class="filter">
	<input type="search" bind:value={query} placeholder="Filter, e.g. grep, chmod, process…" autocomplete="off" aria-label="Filter commands" />
	<span class="hint">{term ? `${shownCount} of ${total} commands` : `${total} commands`}</span>
</div>
<nav class="toc" aria-label="Sections">
	{#each groups as g (g.id)}<a href="#{g.id}">{g.title}</a>{/each}
</nav>
</StickyBar>

{#each filtered as g (g.id)}
	<section id={g.id} hidden={term !== '' && g.shown.length === 0}>
		<h2>{g.title}</h2>
		{#if g.intro}<p class="intro">{g.intro}</p>{/if}
		<div class="tbl">
			<table class="compare">
				<thead><tr><th>DCL</th><th>Unix</th><th>Notes</th></tr></thead>
				<tbody>
					{#each g.shown as r (r.dcl)}
						{@const k = `${g.id}:${r.dcl}`}
						<tr>
							{#if copyable(r.dcl)}
								<td class="cmd" class:copied={copiedKey === k + ':d'} tabindex="0" title="Copy" onclick={(e) => copy(k + ':d', r.dcl, e)} onkeydown={(e) => onKey(e, k + ':d', r.dcl)}><code>{@html highlight(r.dcl, 'dcl')}</code></td>
							{:else}
								<td class="cmd static"><code>{r.dcl}</code></td>
							{/if}
							{#if copyable(r.unix)}
								<td class="cmd unixcmd" class:copied={copiedKey === k + ':u'} tabindex="0" title="Copy" onclick={(e) => copy(k + ':u', r.unix, e)} onkeydown={(e) => onKey(e, k + ':u', r.unix)}><code>{@html highlight(r.unix, 'shell')}</code></td>
							{:else}
								<td class="cmd unixcmd static"><code>{r.unix}</code></td>
							{/if}
							<td class="note">{#if r.note}{@html renderNote(r.note)}{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/each}

{#if term && shownCount === 0}<p class="empty">No commands match that filter.</p>{/if}

<footer>
	Unix commands are shown in their common Linux form; macOS differences are in the notes. Check <code>HELP</code> on VMS and
	<code>man</code> on Unix for the full options.
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>

<style>
	.compare td:first-child {
		width: 36%;
	}
	.compare td.unixcmd {
		width: 28%;
	}
	.compare td.unixcmd code {
		color: var(--fg);
	}
	.compare td.static {
		cursor: default;
	}
	.compare td.static code {
		color: var(--muted);
		font-weight: 400;
	}
	.compare td.note {
		color: var(--muted);
		font-size: 13px;
	}
	/* Per-cell copy feedback (the shared style flags a whole row). */
	.compare td.copied code {
		color: var(--accent);
	}
	.compare td.copied code::after {
		content: '  copied';
		font-family: var(--font-body);
		font-size: 11px;
		color: var(--accent);
	}
	@media (max-width: 560px) {
		.compare td:first-child,
		.compare td.unixcmd {
			width: auto;
		}
		.compare td.unixcmd::before {
			content: 'Unix  ';
			font-size: 11px;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			color: var(--muted);
		}
		.compare td.note:empty {
			display: none;
		}
	}
</style>
