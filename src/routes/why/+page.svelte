<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import { edges, linuxWins, stillRuns } from '#lib/why.js';
	import { resolve } from '$app/paths';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import { Card, List, Li } from 'flowbite-svelte';
	import { Network, History, Files, Database, SquareTerminal, ShieldCheck, Zap, ListOrdered, CircleCheck, Building2 } from '@lucide/svelte';

	// One icon per advantage, in the order of `edges` in why.js.
	const edgeIcons = [Network, History, Files, Database, SquareTerminal, ShieldCheck, Zap, ListOrdered];
</script>

<Seo
	title="Why VMS Is Still Around"
	description="Where OpenVMS still has real advantages over modern Unix and Linux, such as clustering, compatibility and file versioning, and where Linux is the better choice."
/>

<Banner eyebrow="OpenVMS vs. Unix and Linux · An Honest Look" title="Why VMS Is Still Around">
	OpenVMS dates from 1977, yet it still runs systems that must not go down. Linux has closed most of the gap, but a few of
	VMS's design choices are still hard to match. For the commands side by side, see <a href={resolve('/compare')}>VMS vs. Unix</a>.
</Banner>

<SectionLinks links={[['edges', 'Where VMS Still Leads'], ['linux', 'Where Linux Wins'], ['where', 'Where VMS Still Runs'], ['bottom', 'The Bottom Line']]} />

<section id="edges">
	<h2>Where VMS Still Leads</h2>
	<p class="intro">These come from features designed into the operating system from the start, rather than added later.</p>
	<div class="notes edges">
		{#each edges as e, i (e.title)}
			{@const Icon = edgeIcons[i]}
			<Card class="gap-2">
				<h3 class="flex items-center gap-2"><Icon size={18} class="shrink-0 text-accent" aria-hidden="true" />{e.title}</h3>
				<p class="text-sm">{@html e.vms}</p>
				<p class="linux"><span>Linux today</span>{@html e.linux}</p>
			</Card>
		{/each}
	</div>
</section>

<section id="linux">
	<h2>Where Linux Wins</h2>
	<List class="grid max-w-[75ch] list-none gap-2.5">
		{#each linuxWins as w, i (i)}
			<Li class="flex items-start gap-2"><CircleCheck size={17} class="mt-0.5 shrink-0 text-accent" aria-hidden="true" /><span>{@html w}</span></Li>
		{/each}
	</List>
</section>

<section id="where">
	<h2>Where VMS Still Runs</h2>
	<p class="intro">Mostly in systems that have to stay up and rarely change, where a proven platform is worth more than a fashionable one:</p>
	<List class="grid max-w-[75ch] list-none gap-2">
		{#each stillRuns as s (s)}
			<Li class="flex items-start gap-2"><Building2 size={17} class="mt-0.5 shrink-0 text-muted" aria-hidden="true" /><span>{s}</span></Li>
		{/each}
	</List>
</section>

<section id="bottom">
	<h2>The Bottom Line</h2>
	<p>
		VMS's lasting advantages are integrated clustering, long-term stability and a consistent, conservative design. They
		matter most for systems that must not go down and must not change, which is exactly where VMS is still found. For
		almost anything new, Linux wins on ecosystem, cost and flexibility.
	</p>
	<p>
		If you're starting out, the <a href={resolve('/')}>cheat sheet</a> covers the everyday commands, and
		<a href={resolve('/qemu')}>Run It on a Mac</a> or <a href={resolve('/pc')}>Run It on a PC</a> gets you a VMS
		system to try them on.
	</p>
</section>

<footer class="page-footer">
	Written in November 2026, comparing OpenVMS x86-64 V9.2-3 with current Linux. Details change; check vendor documentation
	before relying on any of this for a decision.
</footer>

<style>
	.linux {
		font-size: 13px;
		color: var(--muted);
		border-left: 2px solid var(--rule);
		padding-left: 10px;
	}
	.linux span {
		display: block;
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 2px;
	}
</style>
