import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes blog article HTML body content.
 * Allows rich text formatting, images, and HTML5 video elements (with source tags).
 * Strips dangerous scripts, iframes, and inline event handlers (onerror, onload, etc.).
 *
 * @param {string} content - Raw HTML content from editor
 * @returns {string} Sanitized HTML content safe for storage and rendering
 */
export const sanitizeArticleContent = (content) => {
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  const clean = sanitizeHtml(content, {
    allowedTags: [
      // Content structure & typography
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'ul', 'ol', 'li', 'strong', 'b',
      'em', 'i', 'u', 'strike', 's', 'del', 'mark',
      'code', 'pre', 'hr', 'br', 'span', 'div',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'figure', 'figcaption', 'section', 'article', 'header', 'footer',

      // Hyperlinks
      'a',

      // Media
      'img',
      'video',
      'source',
      'track',
      'audio',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', 'class', 'id', 'style'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id', 'style'],
      video: [
        'src',
        'controls',
        'autoplay',
        'muted',
        'loop',
        'poster',
        'preload',
        'width',
        'height',
        'playsinline',
        'class',
        'id',
        'style',
      ],
      source: ['src', 'type', 'media'],
      track: ['src', 'kind', 'srclang', 'label', 'default'],
      audio: ['src', 'controls', 'autoplay', 'muted', 'loop', 'preload', 'class', 'id', 'style'],
      '*': ['class', 'id', 'style'],
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      video: ['http', 'https', 'data'],
      source: ['http', 'https', 'data'],
    },
    allowProtocolRelative: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });

  return clean;
};

export default sanitizeArticleContent;
