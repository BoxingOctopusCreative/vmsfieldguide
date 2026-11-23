/* global __SITE_URL__ */
// Site-wide metadata used by the <Seo> component, sitemap and robots.txt.

export const siteName = 'OpenVMS Field Notes';

/** Absolute origin, e.g. "https://example.vercel.app", or '' when unknown (local dev). */
export const siteUrl = __SITE_URL__;

/** Social share image, served from /static. */
export const shareImage = {
	path: '/og-image.png',
	width: 1200,
	height: 630,
	alt: 'OpenVMS Field Notes: DCL commands, Unix equivalents, and running OpenVMS on a Mac'
};

/** Paths of every page, for the sitemap. */
export const pages = ['/', '/compare', '/why', '/qemu', '/pc'];

/** @param {string} path */
export const absolute = (path) => (siteUrl ? siteUrl + path : path);
