import { pages, siteUrl } from '#lib/site.js';

export const prerender = true;

// Sitemaps need absolute URLs; with no known site URL (local builds) it lists none.
export function GET() {
	const urls = siteUrl ? pages.map((p) => `\t<url><loc>${siteUrl}${p}</loc></url>`).join('\n') : '';
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
