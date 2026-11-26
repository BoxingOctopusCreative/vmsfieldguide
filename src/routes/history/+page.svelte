<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import { resolve } from '$app/paths';
	import { Card } from 'flowbite-svelte';
	import { SquareTerminal, Network, Files, ShieldCheck, Layers, Clock } from '@lucide/svelte';

	// Years only: exact months vary between sources.
	const timeline = [
		['1975', 'DEC starts work on a 32-bit successor to the PDP-11. The hardware project is code-named Star, and the operating system Starlet.'],
		['1977', 'VAX/VMS 1.0 ships with the first VAX computer, the VAX-11/780. Dave Cutler is one of its lead architects.'],
		['1983', 'VAXclusters let several VAX machines share disks and work as one system, years before clustering was common elsewhere.'],
		['1991', 'VMS gains POSIX support and is renamed OpenVMS, to fit the “open systems” push of the time.'],
		['1992', 'OpenVMS moves to DEC’s new 64-bit Alpha processors. VAX and Alpha systems can run in the same cluster.'],
		['1998', 'Compaq buys DEC, and OpenVMS with it.'],
		['2002', 'HP merges with Compaq and becomes the owner of OpenVMS.'],
		['2005', 'OpenVMS 8.2 brings production support for HP’s Itanium-based Integrity servers.'],
		['2014', 'With HP winding down its own development, VMS Software, Inc. (VSI) is founded and licensed to develop OpenVMS.'],
		['2020', 'HP’s Hobbyist licence program ends, and VSI launches its Community License.'],
		['2022', 'OpenVMS 9.2 is the first production release for standard x86-64 hardware and virtual machines.'],
		['2026', 'VSI ships the 9.2-3 Community kit, with 9.2-4 in field test.']
	];

	const ideas = [
		{ icon: SquareTerminal, title: 'DCL', text: 'One command language with consistent verbs, qualifiers and built-in help, rather than many separate tools.' },
		{ icon: Files, title: 'File Versions', text: 'Saving a file creates a new version, such as <code>LOGIN.COM;3</code>, so earlier copies are kept until you purge them.' },
		{ icon: Layers, title: 'RMS', text: 'The Record Management Services layer gives files structure, such as indexed records, rather than treating them as plain bytes.' },
		{ icon: Network, title: 'Clustering', text: 'Nodes share disks, locks and a single security model, and the cluster carries on when one of them fails.' },
		{ icon: ShieldCheck, title: 'Privileges and Security', text: 'Fine-grained privileges and access control lists instead of one all-powerful root account.' },
		{ icon: Clock, title: 'Compatibility', text: 'Programs written decades ago often still run after recompiling, or sometimes unchanged.' }
	];
</script>

<Seo
	title="What Is OpenVMS?"
	description="A brief history of OpenVMS, from VAX/VMS at Digital Equipment Corporation in 1977 to VSI's x86-64 releases today, and the design ideas that set it apart."
/>

<Banner eyebrow="A Brief History · 1977 to Today" title="What Is OpenVMS?">
	OpenVMS is a multi-user, multitasking operating system first released by Digital Equipment Corporation (DEC) in 1977. It
	was built for reliability, and it still runs banks, exchanges, hospitals and factories. This page covers where it came
	from and what makes it different.
</Banner>

<SectionLinks links={[['timeline', 'Timeline'], ['ideas', 'Key Ideas'], ['name', 'The Name'], ['today', 'OpenVMS Today']]} />

<section id="timeline">
	<h2>Timeline</h2>
	<ol class="timeline">
		{#each timeline as [year, text] (year)}
			<li><span class="year">{year}</span><span>{@html text}</span></li>
		{/each}
	</ol>
</section>

<section id="ideas">
	<h2>Key Ideas</h2>
	<p class="intro">Features designed in from the start, many of which still shape how VMS feels to use.</p>
	<div class="notes">
		{#each ideas as idea (idea.title)}
			<Card class="gap-2">
				<h3 class="flex items-center gap-2"><idea.icon size={18} class="shrink-0 text-accent" aria-hidden="true" />{idea.title}</h3>
				<p class="text-sm">{@html idea.text}</p>
			</Card>
		{/each}
	</div>
	<p>For how these compare with Linux today, see <a href={resolve('/why')}>Why VMS?</a></p>
</section>

<section id="name">
	<h2>The Name</h2>
	<p>
		VMS stands for <strong>Virtual Memory System</strong>, after the virtual memory design it shared with the VAX hardware
		(Virtual Address eXtension). It was called VAX/VMS until 1991, when it became OpenVMS. People still call it “VMS”.
	</p>
	<p>
		Dave Cutler later led the design of Microsoft's Windows NT, and the two systems share a number of ideas. A well-known
		joke notes that shifting each letter of “VMS” along by one gives “WNT”; it's a coincidence, but it stuck.
	</p>
</section>

<section id="today">
	<h2>OpenVMS Today</h2>
	<p>
		VSI develops and sells OpenVMS for x86-64, Integrity and Alpha systems. The x86-64 version runs in virtual machines and
		on supported servers, which means anyone can try it on a laptop. Most users are organisations keeping long-lived
		systems running, plus a community of hobbyists and former DEC people.
	</p>
	<p>
		To try it yourself, start with <a href={resolve('/get')}>Get OpenVMS</a>, then
		<a href={resolve('/qemu')}>Run It on a Mac</a> or <a href={resolve('/pc')}>Run It on a PC</a>, and keep the
		<a href={resolve('/')}>cheat sheet</a> handy.
	</p>
</section>

<footer class="page-footer">
	Written in November 2026. Dates are given to the year; sources sometimes differ by a few months.
</footer>

<style>
	.timeline {
		display: grid;
		gap: 10px;
		max-width: 75ch;
		border-left: 2px solid var(--rule);
		padding-left: 16px;
	}
	.timeline li {
		display: grid;
		grid-template-columns: 3.5rem 1fr;
		gap: 12px;
		position: relative;
	}
	.timeline li::before {
		content: '';
		position: absolute;
		left: -22px;
		top: 0.45em;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
	}
	.year {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--accent);
	}
</style>
