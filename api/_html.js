// Shared helper — escapes user-supplied text before it's interpolated into
// HTML email templates, so form input can't inject markup/links into the
// notification or auto-reply emails.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
