import { siteUrl } from '#lib/site.js';

export const prerender = true;

export function GET() {
	const lines = ['User-agent: *', 'Allow: /'];
	if (siteUrl) lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
	return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain' } });
}
