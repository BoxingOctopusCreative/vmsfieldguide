import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vite';

// Absolute site origin for canonical URLs, Open Graph tags and the sitemap.
// SITE_URL is a Vercel project environment variable (Production); without it, the build falls back
// to Vercel's production domain, and local builds leave absolute URLs out.
const siteUrl = (
	process.env.SITE_URL ||
	(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/+$/, '');

export default defineConfig({
	define: {
		__SITE_URL__: JSON.stringify(siteUrl)
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			// Fully prerendered static site, written to ./build
			adapter: adapter()
		})
	]
});
