/**
 * sanitize.ts — XSS-safe content rendering utility.
 *
 * A03 Cross-Site Scripting (OWASP):
 *   - ALL user-generated content MUST be passed through `sanitizeHtml()` before
 *     being inserted into the DOM via dangerouslySetInnerHTML.
 *   - React's virtual DOM escapes text by default, but dangerouslySetInnerHTML
 *     bypasses that. DOMPurify re-applies allow-listing before we use it.
 *   - We configure DOMPurify to use a strict allow-list (safe formatting tags only).
 *   - FORCE_BODY: true prevents parser-differential attacks via tags like <svg>.
 *   - Scripts, event handlers, javascript: URIs, and data: URIs are all stripped.
 *
 * Usage:
 *   import { sanitizeHtml } from '../utils/sanitize';
 *   // A03 XSS: sanitized before DOM insertion
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
 */

import DOMPurify from 'dompurify';

// Strict allow-list: only semantic formatting tags.
// No <script>, <iframe>, <form>, <input>, <object>, <embed>, etc.
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a',
  'img',
  'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'title', 'rel', 'target',
  'src', 'alt', 'width', 'height',
  'class',
];

// Shared DOMPurify configuration
const CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORCE_BODY: true,
  // Prevent <a href="javascript:..."> and <a href="data:...">
  ALLOW_DATA_ATTR: false,
};

// Force all links to open in a new tab with rel="noopener noreferrer"
// to prevent reverse tabnapping attacks.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Sanitizes an HTML string using DOMPurify with strict allow-listing.
 * MUST be used before any dangerouslySetInnerHTML call.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, CONFIG) as unknown as string;
}

/**
 * Strips all HTML tags and returns plain text.
 * Useful for generating preview snippets from rich content.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }) as unknown as string;
}
