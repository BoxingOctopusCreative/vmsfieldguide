// Site-wide Flowbite overrides, applied with <ThemeProvider> in +layout.svelte.
// Colours already come from the remapped Tailwind palette in app.css; these only adjust
// spacing and density so Flowbite's components fit a compact reference site.

/** @type {import('flowbite-svelte').ThemeConfig} */
export const theme = {
	table: {
		div: 'rounded-lg border border-gray-200 dark:border-gray-700',
		table: 'text-fg dark:text-fg'
	},
	tableHead: 'text-[12px] tracking-wider bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-muted dark:text-muted',
	tableHeadCell: 'px-3.5 py-2.5 font-semibold',
	tableBodyCell: 'px-3.5 py-2 whitespace-normal font-normal align-top',
	card: { base: 'max-w-none shadow-none p-4 gap-1.5' },
	navbarLi: 'no-underline'
};
