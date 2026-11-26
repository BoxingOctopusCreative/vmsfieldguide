<script>
	import Banner from '#lib/Banner.svelte';
	import Seo from '#lib/Seo.svelte';
	import Callout from '#lib/Callout.svelte';
	import SectionLinks from '#lib/SectionLinks.svelte';
	import { resolve } from '$app/paths';
	import { Card, List, Li } from 'flowbite-svelte';
	import { Gift, Award, Code, Building, FlaskConical, GraduationCap, CircleCheck, CircleX } from '@lucide/svelte';

	const VSI = 'https://vmssoftware.com';
	const COMMUNITY = `${VSI}/community/community-license/`;
	const AGREEMENT = `${VSI}/community/community-license/agreement/`;
	const LICENSES = `${VSI}/products/licenses/`;
	const FORUM = 'https://forum.vmssoftware.com/';

	// Every route to a licence VSI currently lists, most hobbyists first.
	const options = [
		{
			icon: Gift,
			title: 'Community License',
			who: 'Anyone learning OpenVMS or doing non-commercial work.',
			what: 'Free. A pre-installed x86-64 system on a virtual disk, renewed each year.',
			href: COMMUNITY
		},
		{
			icon: Award,
			title: 'Ambassador Program',
			who: 'Experienced OpenVMS people who help the community.',
			what: 'Free and non-commercial, with more features than the Community License.',
			href: 'https://forms.vmssoftware.com/vsi-ambassador-program'
		},
		{
			icon: Code,
			title: 'ISV License and Partner Program',
			who: 'Companies that build commercial software for OpenVMS.',
			what: 'No-cost development licences. The Partner Program adds support tiers.',
			href: `${VSI}/about/partners/program/`
		},
		{
			icon: FlaskConical,
			title: 'Commercial Evaluation',
			who: 'Businesses deciding whether to buy.',
			what: 'A time-limited licence that VSI offers case by case.',
			href: 'https://forms.vmssoftware.com/commercial-evaluation-license'
		},
		{
			icon: Building,
			title: 'Commercial License',
			who: 'Anyone running OpenVMS for business.',
			what: 'An annual subscription with VSI support, on x86-64, Integrity or Alpha.',
			href: 'https://forms.vmssoftware.com/commercial-license'
		},
		{
			icon: GraduationCap,
			title: 'Campus-Wide Grant (CSLG)',
			who: 'Non-profit schools, colleges and universities.',
			what: 'Commercial licences at a reduced rate, for running the institution’s own systems.',
			href: LICENSES
		}
	];

	const allowed = [
		'Learning, experimenting and personal projects',
		'Open-source development',
		'Running it in KVM/QEMU, VMware or VirtualBox on x86-64',
		'Keeping one backup copy'
	];
	const notAllowed = [
		'Anything you are paid for, directly or indirectly, or that gives a business an advantage',
		'Sharing, reselling or republishing the kit',
		'Offering it to others as a hosted or timeshare service without VSI’s consent',
		'Reverse-engineering or modifying the software'
	];
</script>

<Seo
	title="Get OpenVMS"
	description="How to get a legal copy of OpenVMS: the free VSI Community License for hobbyists, what's in the kit and its rules, and the other licence options."
/>

<Banner eyebrow="Licensing · The Free Way In" title="Get OpenVMS">
	OpenVMS is owned and licensed by VMS Software, Inc. (VSI). For learning and hobby use, the free Community License gets you
	a ready-installed x86-64 system you can boot in a virtual machine. This page covers how to get it, what it allows, and
	the other options if it doesn't fit.
</Banner>

<SectionLinks links={[['community', 'Community License'], ['steps', 'How to Get It'], ['rules', 'What It Allows'], ['older', 'Alpha and Itanium'], ['options', 'Other Options']]} />

<section id="community">
	<h2>The Community License</h2>
	<p>
		VSI's <a href={COMMUNITY} target="_blank" rel="noopener">Community License</a> replaced the old HP Hobbyist program.
		It's free, and it's meant for people learning OpenVMS, open-source work and sharing knowledge.
	</p>
	<List class="grid max-w-[75ch] gap-1.5 ps-5 list-disc">
		<Li><strong>What you get:</strong> a pre-installed OpenVMS x86-64 system with a few layered products, as a virtual disk, not an installer. The 2026 kit is a RAR of about 1.3&nbsp;GB, holding a VMware disk with V9.2-3.</Li>
		<Li><strong>Where it runs:</strong> KVM/QEMU, VMware and VirtualBox on an x86-64 machine. On Apple Silicon, it runs under emulation; see <a href={resolve('/qemu')}>Run It on a Mac</a>.</Li>
		<Li><strong>How long it lasts:</strong> the current kit is valid until 30 March 2027, when VSI publishes a new one. Plan to download the new kit each year and move your files across.</Li>
		<Li><strong>Support:</strong> none from VSI. Help comes from the <a href={FORUM} target="_blank" rel="noopener">VSI forum</a>, and the agreement asks you to take part there.</Li>
	</List>
</section>

<section id="steps">
	<h2>How to Get It</h2>
	<ol class="grid max-w-[75ch] list-decimal gap-2 ps-5">
		<li>Open the <a href={COMMUNITY} target="_blank" rel="noopener">Community License page</a> and read the <a href={AGREEMENT} target="_blank" rel="noopener">agreement</a>.</li>
		<li>Fill in VSI's registration form, linked from that page.</li>
		<li>Download the kit from the details VSI sends you. It's large, so use a reliable connection.</li>
		<li>Unpack it and boot it: <a href={resolve('/qemu')}>Run It on a Mac</a> or <a href={resolve('/pc')}>Run It on a PC</a> walks you through it.</li>
	</ol>
	<Callout title="Tip">
		<p>Keep the original RAR. When something goes wrong in your VM, a fresh copy of the disk gets you back to a clean system in minutes.</p>
	</Callout>
</section>

<section id="rules">
	<h2>What It Allows</h2>
	<p class="intro">A summary of the <a href={AGREEMENT} target="_blank" rel="noopener">Community License agreement</a>. The agreement itself is what counts.</p>
	<div class="notes">
		<Card class="gap-2">
			<h3 class="flex items-center gap-2"><CircleCheck size={18} class="shrink-0 text-accent" aria-hidden="true" />Allowed</h3>
			<ul class="grid list-disc gap-1 ps-5 text-sm">
				{#each allowed as a (a)}<li>{a}</li>{/each}
			</ul>
		</Card>
		<Card class="gap-2">
			<h3 class="flex items-center gap-2"><CircleX size={18} class="shrink-0 text-warn" aria-hidden="true" />Not Allowed</h3>
			<ul class="grid list-disc gap-1 ps-5 text-sm">
				{#each notAllowed as n (n)}<li>{n}</li>{/each}
			</ul>
		</Card>
	</div>
	<Callout kind="warn" title="Using It at Work">
		<p>If OpenVMS is part of a job, even a side project you're paid for, the Community License doesn't cover it. Look at the evaluation or commercial options below.</p>
	</Callout>
</section>

<section id="older">
	<h2>Alpha and Itanium</h2>
	<p>
		VSI says new Community Licenses for Alpha and Integrity (Itanium) systems are not currently available. If you have old
		DEC, Compaq or HP hardware, or an Alpha emulator, a free licence isn't on offer for it right now. Commercial licences for
		both are still sold. The old HP Hobbyist licences have ended, so treat any PAKs you find online as unlicensed.
	</p>
</section>

<section id="options">
	<h2>Other Options</h2>
	<p class="intro">Every route VSI lists on its <a href={LICENSES} target="_blank" rel="noopener">licences page</a>.</p>
	<div class="notes">
		{#each options as o (o.title)}
			<Card class="gap-2">
				<h3 class="flex items-center gap-2"><o.icon size={18} class="shrink-0 text-accent" aria-hidden="true" /><a href={o.href} target="_blank" rel="noopener" class="text-fg no-underline hover:underline">{o.title}</a></h3>
				<p class="text-sm"><span class="text-muted">For:</span> {o.who}</p>
				<p class="text-sm">{o.what}</p>
			</Card>
		{/each}
	</div>
</section>

<footer class="page-footer">
	Checked against VSI's website in November 2026. Licence terms and dates change; check
	<a href={LICENSES} target="_blank" rel="noopener">vmssoftware.com</a> before relying on any of this.
</footer>
