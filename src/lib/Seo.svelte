<script>
	import { page } from '$app/state';
	import { siteName, siteUrl, shareImage, absolute } from '#lib/site.js';

	/** @type {{ title: string, description: string }} */
	let { title, description } = $props();

	let fullTitle = $derived(title === siteName ? siteName : `${title} · ${siteName}`);
	let url = $derived(absolute(page.url.pathname));
	let image = absolute(shareImage.path);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	{#if siteUrl}<link rel="canonical" href={url} />{/if}

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	{#if siteUrl}<meta property="og:url" content={url} />{/if}
	<meta property="og:image" content={image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content={String(shareImage.width)} />
	<meta property="og:image:height" content={String(shareImage.height)} />
	<meta property="og:image:alt" content={shareImage.alt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:image:alt" content={shareImage.alt} />
</svelte:head>
