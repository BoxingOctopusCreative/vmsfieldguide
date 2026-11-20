<script>
	import { sections } from '#lib/sections.js';
	import { copyText } from '#lib/copy.js';
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

<svelte:head>
	<title>OpenVMS Field Notes</title>
	<meta name="description" content="Everyday OpenVMS DCL commands with Unix equivalents, plus notes for running OpenVMS x86-64 under QEMU on a Mac." />
</svelte:head>

<header>
	<div class="eyebrow">OpenVMS x86-64 V9.2-3 · DCL quick reference</div>
	<h1>OpenVMS Field Notes</h1>
	<p class="lede">The commands and ideas you need most in your first weeks on VMS, with Unix equivalents where they help. The last section covers the QEMU setup on the Mac; the full walkthrough is on <a href={resolve('/qemu')}>Run it on a Mac</a>. Click any command to copy it.</p>
</header>

<div class="filter">
	<input type="search" bind:value={query} placeholder="Filter commands, e.g. delete, process, tcpip…" autocomplete="off" aria-label="Filter commands" />
	<span class="hint">{term ? `${shownCount} of ${total} commands` : `${total} commands`}</span>
</div>
<nav class="toc" aria-label="Sections">
	<a href="#basics">Basics</a><a href="#unix">Unix → DCL</a><a href="#keys">Keys</a><a href="#files">Files</a><a href="#dirs">Directories</a><a href="#info">System info</a><a href="#procs">Processes &amp; batch</a><a href="#symbols">Symbols &amp; logicals</a><a href="#users">Users</a><a href="#net">TCP/IP &amp; SSH</a><a href="#admin">Admin &amp; shutdown</a><a href="#vm">Your VM</a>
</nav>

<section id="basics" bind:this={staticEls.basics} hidden={staticHit.basics === false}>
    <h2>How VMS thinks</h2>
    <div class="spec">
      <div class="spec-line">
        <div class="spec-parts" aria-label="File specification anatomy">
          <span><b>X86923::</b><small>node</small></span>
          <span><b>DKA0:</b><small>device</small></span>
          <span><b>[SYSTEM.NOTES]</b><small>directory</small></span>
          <span><b>TODO</b><small>name</small></span>
          <span><b>.TXT</b><small>type</small></span>
          <span><b>;3</b><small>version</small></span>
        </div>
      </div>
      <p>A full file specification. You usually type only the parts you need: <code>TODO.TXT</code> means the newest version in your current directory. Your VM's node name is <code>X86923</code>.</p>
    </div>
    <div class="notes">
      <div><h3>Files have versions</h3><p>Every save creates <code>;2</code>, <code>;3</code>, and so on. Nothing is overwritten. <code>PURGE</code> deletes the old versions, and <code>DELETE</code> needs a version number (<code>;*</code> for all of them).</p></div>
      <div><h3>Case-insensitive commands</h3><p>DCL uppercases what you type. Commands and qualifiers can be shortened to any unique prefix: <code>DIR</code>, <code>SH DEF</code>, <code>DEL</code>.</p></div>
      <div><h3>Qualifiers use slashes</h3><p>Options are <code>/QUALIFIER</code> or <code>/QUALIFIER=value</code>, e.g. <code>DIRECTORY/SIZE/DATE</code>. <code>/NO…</code> turns one off.</p></div>
      <div><h3>Wildcards</h3><p><code>*</code> matches any characters, <code>%</code> matches exactly one, and <code>[...]</code> searches every subdirectory below the current one.</p></div>
      <div><h3>Logical names</h3><p>Named aliases for devices, directories or files, like <code>SYS$LOGIN</code> (your home) and <code>SYS$SYSTEM</code>. Use them anywhere a path goes.</p></div>
      <div><h3>Privileges, not root</h3><p>Rights come from individual privileges (SYSPRV, BYPASS, CMKRNL…) granted to an account. SYSTEM has them all, so be careful as SYSTEM.</p></div>
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
							<td class="cmd" tabindex="0" title="Copy" onclick={(e) => copy(key, r.copy, e)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(key, r.copy, e); } }}>{@html r.cmd}</td>
							<td class={s.unix ? 'unix' : undefined}>{@html r.desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if s.after}{@html s.after}{/if}
	</section>
{/snippet}

{@render table(filtered[0])}

<section id="keys" bind:this={staticEls.keys} hidden={staticHit.keys === false}>
    <h2>Keys at the <code>$</code> prompt</h2>
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

{#each filtered.slice(1) as s (s.id)}
	{@render table(s)}
{/each}

{#if nothing}<p class="empty">No commands match that filter.</p>{/if}

<footer>
	For depth, use <code>HELP</code> on the VM itself, or VSI's documentation at <a href="https://docs.vmssoftware.com/" target="_blank" rel="noopener">docs.vmssoftware.com</a>.
</footer>
