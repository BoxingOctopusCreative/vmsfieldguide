<script>
	// Page title banner: eyebrow, title and intro on the left, the OpenVMS logo on the right.
	// On narrow screens the logo moves above the title (see .banner in app.css).
	/** @type {{ eyebrow: string, title: string, children: import('svelte').Snippet }} */
	let { eyebrow, title, children } = $props();
</script>

<header class="banner">
	<div class="banner-text">
		<div class="eyebrow">{eyebrow}</div>
		<h1>{title}</h1>
		<p class="lede">{@render children()}</p>
	</div>
	<img class="banner-logo" src="/openvms-logo.svg" alt="OpenVMS" width="465" height="108" />
</header>
