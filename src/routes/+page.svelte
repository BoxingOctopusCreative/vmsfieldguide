<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import StickyBar from '#lib/StickyBar.svelte';
	import FilterInput from '#lib/FilterInput.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import Callout from '#lib/Callout.svelte';
	import { Card, Kbd, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell } from 'flowbite-svelte';
	import { sections } from '#lib/sections.js';
	import { copyText } from '#lib/copy.js';
	import { highlight } from '#lib/highlight.js';
	import { resolve } from '$app/paths';

	let query = $state('');
	let term = $derived(query.trim().toLowerCase());
	/** @type {Record<string, HTMLElement>} */
	let staticEls = $state({});
	let copiedKey = $state('');

	const strip = (/** @type {string} */ s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').toLowerCase();
	const indexed = sections.map((s) => ({ ...s, rows: s.rows.map((r) => ({ ...r, text: strip(r.cmd + ' ' + r.desc) })) }));
	const total = indexed.reduce((n, s) => n + s.rows.length, 0);

	let filtered = $derived(indexed.map((s) => ({ ...s, shown: term ? s.rows.filter((r) => r.text.includes(term)) : s.rows })));
	let shownCount = $derived(filtered.reduce((n, s) => n + s.shown.length, 0));
	let staticHit = $derived(
		Object.fromEntries(Object.entries(staticEls).map(([id, el]) => [id, !term || (el?.textContent ?? '').toLowerCase().includes(term)]))
	);
	let nothing = $derived(term && shownCount === 0 && Object.values(staticHit).every((v) => !v));

	/** @param {string} key @param {string} text @param {Event} e */
	async function copy(key, text, e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget).querySelector('code') ?? undefined;
		if (await copyText(text, el)) {
			copiedKey = key;
			setTimeout(() => copiedKey === key && (copiedKey = ''), 1200);
		}
	}

	const sectionLinks = /** @type {Array<[string, string]>} */ ([
		['basics', 'Basics'], ['keys', 'Keys'], ['files', 'Files'], ['dirs', 'Directories'], ['info', 'System Info'],
		['procs', 'Processes & Batch'], ['symbols', 'Symbols & Logicals'], ['users', 'Users'], ['net', 'TCP/IP & SSH'],
		['admin', 'Admin & Shutdown']
	]);
	const notes = [
		['Files Have Versions', 'Every save creates <code>;2</code>, <code>;3</code>, and so on. Nothing is overwritten. <code>PURGE</code> deletes the old versions, and <code>DELETE</code> needs a version number (<code>;*</code> for all of them).'],
		['Case-Insensitive Commands', 'DCL uppercases what you type. Commands and qualifiers can be shortened to any unique prefix: <code>DIR</code>, <code>SH DEF</code>, <code>DEL</code>.'],
		['Qualifiers Use Slashes', 'Options are <code>/QUALIFIER</code> or <code>/QUALIFIER=value</code>, e.g. <code>DIRECTORY/SIZE/DATE</code>. <code>/NO…</code> turns one off.'],
		['Wildcards', '<code>*</code> matches any characters, <code>%</code> matches exactly one, and <code>[...]</code> searches every subdirectory below the current one.'],
		['Logical Names', 'Named aliases for devices, directories or files, like <code>SYS$LOGIN</code> (your home) and <code>SYS$SYSTEM</code>. Use them anywhere a path goes.'],
		['Privileges, Not Root', 'Rights come from individual privileges (SYSPRV, BYPASS, CMKRNL…) granted to an account. SYSTEM has them all, so be careful as SYSTEM.']
	];
	const keys = [
		['↑ / ↓', 'Recall earlier commands'], ['Ctrl-Y', 'Interrupt the running program'], ['Ctrl-C', 'Cancel (many programs treat it like Ctrl-Y)'],
		['Ctrl-Z', 'End of input, or exit a utility'], ['Ctrl-T', 'Show what your process is doing'], ['Ctrl-U', 'Erase the current line'],
		['Ctrl-S / Q', 'Pause / resume output'], ['Ctrl-O', 'Discard output until pressed again'], ['-', 'At line end: continue the command on the next line']
	];
</script>

<Seo title="OpenVMS Field Notes" description="Everyday OpenVMS DCL commands and concepts for newcomers, plus notes for running OpenVMS x86-64 under QEMU on a Mac." />

<Banner eyebrow="OpenVMS x86-64 V9.2-3 · DCL quick reference" title="OpenVMS Field Notes">
	The commands and ideas you need most in your first weeks on VMS. Coming from Unix? <a href={resolve('/compare')}>VMS vs. Unix</a> maps the commands you already know. Want to run VMS yourself? <a href={resolve('/qemu')}>Run It on a Mac</a> walks through it. Click any command to copy it.
</Banner>

<StickyBar>
	<FilterInput bind:value={query} placeholder="Filter commands, e.g. delete, process, tcpip…" label="Filter commands" count={term ? `${shownCount} of ${total} commands` : `${total} commands`} />
	<SectionLinks links={sectionLinks} />
</StickyBar>

<section id="basics" bind:this={staticEls.basics} hidden={staticHit.basics === false}>
    <h2>How VMS Thinks</h2>
    <Card class="gap-3.5 p-[18px]">
      <div class="spec-line">
        <div class="spec-parts" aria-label="File specification anatomy">
          <span><b class="hl-var">MYNODE::</b><small>node</small></span>
          <span><b class="hl-num">DKA0:</b><small>device</small></span>
          <span><b class="hl-path">[SYSTEM.NOTES]</b><small>directory</small></span>
          <span><b class="hl-str">TODO</b><small>name</small></span>
          <span><b class="hl-flag">.TXT</b><small>type</small></span>
          <span><b class="hl-cmd">;3</b><small>version</small></span>
        </div>
      </div>
      <p>A full file specification. You usually type only the parts you need: <code>TODO.TXT</code> means the newest version in your current directory.</p>
    </Card>
    <div class="notes">
      {#each notes as [title, body] (title)}
        <Card><h3>{title}</h3><p class="text-sm text-muted">{@html body}</p></Card>
      {/each}
    </div>
</section>

{#snippet table(/** @type {(typeof filtered)[number]} */ s)}
	<section id={s.id} hidden={term !== '' && s.shown.length === 0}>
		<h2>{@html s.title}</h2>
		{#if s.intro}<p class="intro">{@html s.intro}</p>{/if}
		<div class="cmd-table">
			<Table hoverable>
				<TableHead>{#each s.heads as h (h)}<TableHeadCell>{h}</TableHeadCell>{/each}</TableHead>
				<TableBody>
					{#each s.shown as r, i (r.cmd)}
						{@const key = `${s.id}-${i}-${r.copy}`}
						<TableBodyRow class={copiedKey === key ? 'copied' : ''}>
							<TableBodyCell class="cmd w-[46%]" title="Copy" onclick={(/** @type {Event} */ e) => copy(key, r.copy, e)}><code>{@html highlight(r.copy, 'dcl')}</code></TableBodyCell>
							<TableBodyCell>{@html r.desc}</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
		{#if s.after}<Callout kind="info">{@html s.after}</Callout>{/if}
	</section>
{/snippet}

<section id="keys" bind:this={staticEls.keys} hidden={staticHit.keys === false}>
    <h2>Keys at the <code>$</code> Prompt</h2>
    <div class="keys">
      {#each keys as [key, what] (key)}
        <div><Kbd>{key}</Kbd><span>{what}</span></div>
      {/each}
    </div>
</section>

{#each filtered as s (s.id)}
	{@render table(s)}
{/each}

{#if nothing}<p class="empty">No commands match that filter.</p>{/if}

<footer class="page-footer">
	For depth, use <code>HELP</code> on the VM itself, or VSI's documentation at <a href="https://docs.vmssoftware.com/" target="_blank" rel="noopener">docs.vmssoftware.com</a>.
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>
