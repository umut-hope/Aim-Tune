/**
 * Helpers for messages that carry a little markup (keys ending in `Html`,
 * rendered with {@html}). Every value put into such a message goes through
 * `esc` or `num`, so only the dictionary's own markup is ever rendered.
 */

export function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A number (or number with unit) in the mono number style. */
export function num(value: string | number): string {
  return `<span class="num">${esc(value)}</span>`
}
