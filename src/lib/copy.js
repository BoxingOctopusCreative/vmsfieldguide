/**
 * Copy text to the clipboard. If the Clipboard API is unavailable or refused,
 * select the given element's contents instead so the user can copy by hand.
 * @param {string} text
 * @param {Element} [fallbackEl]
 * @returns {Promise<boolean>} true when the text reached the clipboard
 */
export async function copyText(text, fallbackEl) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		if (fallbackEl) {
			const range = document.createRange();
			range.selectNodeContents(fallbackEl);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
		}
		return false;
	}
}
