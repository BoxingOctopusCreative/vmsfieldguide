<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import StickyBar from '#lib/StickyBar.svelte';
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
</script>

<Seo title="OpenVMS Field Notes" description="Everyday OpenVMS DCL commands and concepts for newcomers, plus notes for running OpenVMS x86-64 under QEMU on a Mac." />

<Banner eyebrow="OpenVMS x86-64 V9.2-3 · DCL quick reference" title="OpenVMS Field Notes">
	The commands and ideas you need most in your first weeks on VMS. Coming from Unix? <a href={resolve('/compare')}>VMS vs. Unix</a> maps the commands you already know. Want to run VMS yourself? <a href={resolve('/qemu')}>Run It on a Mac</a> walks through it. Click any command to copy it.
</Banner>

<StickyBar>
<div class="filter">
	<input type="search" bind:value={query} placeholder="Filter commands, e.g. delete, process, tcpip…" autocomplete="off" aria-label="Filter commands" />
	<span class="hint">{term ? `${shownCount} of ${total} commands` : `${total} commands`}</span>
</div>
<nav class="toc" aria-label="Sections">
	<a href="#basics">Basics</a><a href="#keys">Keys</a><a href="#files">Files</a><a href="#dirs">Directories</a><a href="#info">System Info</a><a href="#procs">Processes &amp; Batch</a><a href="#symbols">Symbols &amp; Logicals</a><a href="#users">Users</a><a href="#net">TCP/IP &amp; SSH</a><a href="#admin">Admin &amp; Shutdown</a>
</nav>
</StickyBar>

<section id="basics" bind:this={staticEls.basics} hidden={staticHit.basics === false}>
    <h2>How VMS Thinks</h2>
    <div class="spec">
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
    </div>
    <div class="notes">
      <div><h3>Files Have Versions</h3><p>Every save creates <code>;2</code>, <code>;3</code>, and so on. Nothing is overwritten. <code>PURGE</code> deletes the old versions, and <code>DELETE</code> needs a version number (<code>;*</code> for all of them).</p></div>
      <div><h3>Case-Insensitive Commands</h3><p>DCL uppercases what you type. Commands and qualifiers can be shortened to any unique prefix: <code>DIR</code>, <code>SH DEF</code>, <code>DEL</code>.</p></div>
      <div><h3>Qualifiers Use Slashes</h3><p>Options are <code>/QUALIFIER</code> or <code>/QUALIFIER=value</code>, e.g. <code>DIRECTORY/SIZE/DATE</code>. <code>/NO…</code> turns one off.</p></div>
      <div><h3>Wildcards</h3><p><code>*</code> matches any characters, <code>%</code> matches exactly one, and <code>[...]</code> searches every subdirectory below the current one.</p></div>
      <div><h3>Logical Names</h3><p>Named aliases for devices, directories or files, like <code>SYS$LOGIN</code> (your home) and <code>SYS$SYSTEM</code>. Use them anywhere a path goes.</p></div>
      <div><h3>Privileges, Not Root</h3><p>Rights come from individual privileges (SYSPRV, BYPASS, CMKRNL…) granted to an account. SYSTEM has them all, so be careful as SYSTEM.</p></div>
    </div>
</section>

{#snippet table(/** @type {(typeof filtered)[number]} */ s)}
	<section id={s.id} hidden={term !== '' && s.shown.length === 0}>
		<h2>{@html s.title}</h2>
		{#if s.intro}<p class="intro">{@html s.intro}</p>{/if}
		<div class="tbl">
			<table>
				<thead><tr>{#each s.heads as h (h)}<th>{h}</th>{/each}</tr></thead>
				<tbody>
					{#each s.shown as r, i (r.cmd)}
						{@const key = `${s.id}-${i}-${r.copy}`}
						<tr class:copied={copiedKey === key}>
							<td class="cmd" tabindex="0" title="Copy" onclick={(e) => copy(key, r.copy, e)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(key, r.copy, e); } }}><code>{@html highlight(r.copy, 'dcl')}</code></td>
							<td>{@html r.desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if s.after}{@html s.after}{/if}
	</section>
{/snippet}

<section id="keys" bind:this={staticEls.keys} hidden={staticHit.keys === false}>
    <h2>Keys at the <code>$</code> Prompt</h2>
    <div class="keys">
      <div><kbd>↑ / ↓</kbd><span>Recall earlier commands</span></div>
      <div><kbd>Ctrl-Y</kbd><span>Interrupt the running program</span></div>
      <div><kbd>Ctrl-C</kbd><span>Cancel (many programs treat it like Ctrl-Y)</span></div>
      <div><kbd>Ctrl-Z</kbd><span>End of input, or exit a utility</span></div>
      <div><kbd>Ctrl-T</kbd><span>Show what your process is doing</span></div>
      <div><kbd>Ctrl-U</kbd><span>Erase the current line</span></div>
      <div><kbd>Ctrl-S / Q</kbd><span>Pause / resume output</span></div>
      <div><kbd>Ctrl-O</kbd><span>Discard output until pressed again</span></div>
      <div><kbd>-</kbd><span>At line end: continue the command on the next line</span></div>
    </div>
</section>

{#each filtered as s (s.id)}
	{@render table(s)}
{/each}

{#if nothing}<p class="empty">No commands match that filter.</p>{/if}

<footer>
	For depth, use <code>HELP</code> on the VM itself, or VSI's documentation at <a href="https://docs.vmssoftware.com/" target="_blank" rel="noopener">docs.vmssoftware.com</a>.
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>
