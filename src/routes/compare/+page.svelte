<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import StickyBar from '#lib/StickyBar.svelte';
	import { groups } from '#lib/compare.js';
	import { copyText } from '#lib/copy.js';
	import { highlight } from '#lib/highlight.js';
	import { resolve } from '$app/paths';
	import FilterInput from '#lib/FilterInput.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell } from 'flowbite-svelte';

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

</script>

<Seo title="VMS vs. Unix" description="OpenVMS DCL commands side by side with their closest Unix, Linux and macOS equivalents, with notes on where they differ." />

<Banner eyebrow="DCL ↔ Unix · Linux · macOS" title="VMS vs. Unix">
	DCL commands next to the closest thing on a Unix-like system. Many map one to one; where they don't, the note says what's
	different. Click either command to copy it. For VMS concepts like file versions and logical names, start with the
	<a href={resolve('/')}>cheat sheet</a>.
</Banner>

<StickyBar>
	<FilterInput bind:value={query} placeholder="Filter, e.g. grep, chmod, process…" label="Filter commands" count={term ? `${shownCount} of ${total} commands` : `${total} commands`} />
	<SectionLinks links={groups.map((g) => /** @type {[string, string]} */ ([g.id, g.title]))} />
</StickyBar>

{#each filtered as g (g.id)}
	<section id={g.id} hidden={term !== '' && g.shown.length === 0}>
		<h2>{g.title}</h2>
		{#if g.intro}<p class="intro">{g.intro}</p>{/if}
		<div class="cmd-table compare">
			<Table hoverable>
				<TableHead><TableHeadCell>DCL</TableHeadCell><TableHeadCell>Unix</TableHeadCell><TableHeadCell>Notes</TableHeadCell></TableHead>
				<TableBody>
					{#each g.shown as r (r.dcl)}
						{@const k = `${g.id}:${r.dcl}`}
						<TableBodyRow>
							{#if copyable(r.dcl)}
								<TableBodyCell class="cmd dcl {copiedKey === k + ':d' ? 'copied' : ''}" title="Copy" onclick={(/** @type {Event} */ e) => copy(k + ':d', r.dcl, e)}><code>{@html highlight(r.dcl, 'dcl')}</code></TableBodyCell>
							{:else}
								<TableBodyCell class="cmd dcl static"><code>{r.dcl}</code></TableBodyCell>
							{/if}
							{#if copyable(r.unix)}
								<TableBodyCell class="cmd unixcmd {copiedKey === k + ':u' ? 'copied' : ''}" title="Copy" onclick={(/** @type {Event} */ e) => copy(k + ':u', r.unix, e)}><code>{@html highlight(r.unix, 'shell')}</code></TableBodyCell>
							{:else}
								<TableBodyCell class="cmd unixcmd static"><code>{r.unix}</code></TableBodyCell>
							{/if}
							<TableBodyCell class="note">{#if r.note}{@html renderNote(r.note)}{/if}</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</section>
{/each}

{#if term && shownCount === 0}<p class="empty">No commands match that filter.</p>{/if}

<footer class="page-footer">
	Unix commands are shown in their common Linux form; macOS differences are in the notes. Check <code>HELP</code> on VMS and
	<code>man</code> on Unix for the full options.
</footer>

<style>
	/* The table cells are Flowbite components, so these reach them with :global inside .compare. */
	.compare :global(td.dcl) {
		width: 36%;
	}
	.compare :global(td.unixcmd) {
		width: 28%;
	}
	.compare :global(td.static) {
		cursor: default;
	}
	.compare :global(td.static code) {
		color: var(--muted);
		font-weight: 400;
	}
	.compare :global(td.note) {
		color: var(--muted);
		font-size: 13px;
	}
	@media (max-width: 560px) {
		.compare :global(td.dcl),
		.compare :global(td.unixcmd) {
			width: auto;
		}
		.compare :global(td.unixcmd)::before {
			content: 'Unix  ';
			font-size: 11px;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			color: var(--muted);
		}
		.compare :global(td.note:empty) {
			display: none;
		}
	}
</style>
