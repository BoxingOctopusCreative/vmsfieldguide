<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import { edges, linuxWins, stillRuns } from '#lib/why.js';
	import { resolve } from '$app/paths';
</script>

<Seo
	title="Why VMS Is Still Around"
	description="Where OpenVMS still has real advantages over modern Unix and Linux, such as clustering, compatibility and file versioning, and where Linux is the better choice."
/>

<Banner eyebrow="OpenVMS vs. Unix and Linux · An Honest Look" title="Why VMS Is Still Around">
	OpenVMS dates from 1977, yet it still runs systems that must not go down. Linux has closed most of the gap, but a few of
	VMS's design choices are still hard to match. For the commands side by side, see <a href={resolve('/compare')}>VMS vs. Unix</a>.
</Banner>

<nav class="toc" aria-label="Sections">
	<a href="#edges">Where VMS Still Leads</a><a href="#linux">Where Linux Wins</a><a href="#where">Where VMS Still Runs</a><a href="#bottom">The Bottom Line</a>
</nav>

<section id="edges">
	<h2>Where VMS Still Leads</h2>
	<p class="intro">These come from features designed into the operating system from the start, rather than added later.</p>
	<div class="notes edges">
		{#each edges as e (e.title)}
			<div>
				<h3>{e.title}</h3>
				<p>{@html e.vms}</p>
				<p class="linux"><span>Linux today</span>{@html e.linux}</p>
			</div>
		{/each}
	</div>
</section>

<section id="linux">
	<h2>Where Linux Wins</h2>
	<ul class="points">
		{#each linuxWins as w, i (i)}<li>{@html w}</li>{/each}
	</ul>
</section>

<section id="where">
	<h2>Where VMS Still Runs</h2>
	<p class="intro">Mostly in systems that have to stay up and rarely change, where a proven platform is worth more than a fashionable one:</p>
	<ul class="points">
		{#each stillRuns as s (s)}<li>{s}</li>{/each}
	</ul>
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

<footer>
	Written in November 2026, comparing OpenVMS x86-64 V9.2-3 with current Linux. Details change; check vendor documentation
	before relying on any of this for a decision.
	<p class="tm">OpenVMS and the OpenVMS logo are trademarks of VMS Software, Inc. This is an unofficial fan reference.</p>
</footer>

<style>
	.edges > div {
		display: grid;
		gap: 8px;
		align-content: start;
	}
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
