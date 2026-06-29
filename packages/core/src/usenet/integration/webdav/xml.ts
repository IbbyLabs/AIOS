import { WEBDAV_BASE } from './paths.js';
import type { WebdavNode } from './tree.js';

/** Escape a string for inclusion in XML text/attribute content. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Absolute, percent-encoded href for a node, rooted at the `/dav` mount.
 * Collections get a trailing slash (WebDAV clients rely on it to tell a
 * directory from a file).
 */
export function webdavHref(node: WebdavNode): string {
  const encoded = node.segments.map((s) => encodeURIComponent(s)).join('/');
  const path = encoded ? `${WEBDAV_BASE}/${encoded}` : `${WEBDAV_BASE}/`;
  if (node.kind === 'collection' && !path.endsWith('/')) return `${path}/`;
  return path;
}

// Stable fallback for nodes without a real mtime (virtual folders) so PROPFIND
// responses don't change timestamp on every call.
const DEFAULT_MTIME = new Date('2020-01-01T00:00:00Z');

function httpDate(d?: Date): string {
  return (d ?? DEFAULT_MTIME).toUTCString();
}

function isoDate(d?: Date): string {
  return (d ?? DEFAULT_MTIME).toISOString();
}

/** One `<D:response>` block for a node. */
function renderResponse(node: WebdavNode): string {
  const href = escapeXml(webdavHref(node));
  const displayName = escapeXml(node.name || 'dav');
  const lastModified = httpDate(node.mtime);
  const created = isoDate(node.mtime);

  if (node.kind === 'collection') {
    return `<D:response>
<D:href>${href}</D:href>
<D:propstat>
<D:prop>
<D:displayname>${displayName}</D:displayname>
<D:resourcetype><D:collection/></D:resourcetype>
<D:getlastmodified>${lastModified}</D:getlastmodified>
<D:creationdate>${created}</D:creationdate>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
  }

  return `<D:response>
<D:href>${href}</D:href>
<D:propstat>
<D:prop>
<D:displayname>${displayName}</D:displayname>
<D:resourcetype/>
<D:getcontentlength>${node.size}</D:getcontentlength>
<D:getcontenttype>${escapeXml(node.contentType)}</D:getcontenttype>
<D:getlastmodified>${lastModified}</D:getlastmodified>
<D:creationdate>${created}</D:creationdate>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
}

/**
 * Render a `207 Multistatus` body for a PROPFIND. Pass the self node first,
 * then (for `Depth: 1`) its children. The order is preserved; clients sort
 * themselves.
 */
export function renderPropfind(nodes: WebdavNode[]): string {
  const body = nodes.map(renderResponse).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${body}
</D:multistatus>`;
}
