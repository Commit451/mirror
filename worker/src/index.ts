interface Env {
  BUCKET: R2Bucket;
}

// SPA routes that should serve index.html
const SPA_ROUTES = ['/', '/index.html'];

// File extensions that indicate a direct file request (not a directory)
const FILE_EXTENSIONS = /\.[a-zA-Z0-9]+$/;

// Security headers applied to all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

// CSP for HTML pages only
const HTML_CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'";

function addSecurityHeaders(response: Response, isHtml = false): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  if (isHtml) {
    headers.set('Content-Security-Policy', HTML_CSP);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Creates a redirect response with security headers.
 */
function secureRedirect(url: string, status: 301 | 302 = 301): Response {
  const response = new Response(null, {
    status,
    headers: { 'Location': url },
  });
  return addSecurityHeaders(response);
}

/**
 * Validates and sanitizes the request path.
 * Returns null if the path is malicious.
 */
function sanitizePath(rawPath: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    // Malformed percent-encoding
    return null;
  }

  // Block null bytes and backslashes
  if (path.includes('\0') || path.includes('\\')) {
    return null;
  }

  // Block path traversal: check each segment for ".."
  const segments = path.split('/');
  if (segments.some(segment => segment === '..')) {
    return null;
  }

  return path;
}

/**
 * Serves a file from R2, handling HEAD requests efficiently.
 * For HEAD requests, uses BUCKET.head() to avoid streaming the full body.
 */
async function serveR2Object(
  env: Env,
  key: string,
  contentType: string,
  cacheControl: string,
  isHead: boolean,
): Promise<Response | null> {
  if (isHead) {
    const head = await env.BUCKET.head(key);
    if (!head) return null;
    return new Response(null, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': head.size.toString(),
        'ETag': head.etag,
        'Cache-Control': cacheControl,
      },
    });
  }

  const file = await env.BUCKET.get(key);
  if (!file) return null;
  return new Response(file.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': file.size.toString(),
      'ETag': file.etag,
      'Cache-Control': cacheControl,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only allow GET and HEAD methods
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const response = new Response('Method Not Allowed', { status: 405 });
      response.headers.set('Allow', 'GET, HEAD');
      return addSecurityHeaders(response);
    }

    const isHead = request.method === 'HEAD';
    const url = new URL(request.url);
    const path = sanitizePath(url.pathname);

    if (path === null) {
      return addSecurityHeaders(new Response('Bad Request', { status: 400 }));
    }

    // Handle SPA routes - serve index.html
    if (SPA_ROUTES.includes(path)) {
      return addSecurityHeaders(await serveFile(env, 'index.html', 'text/html; charset=utf-8', isHead), true);
    }

    // Handle static assets (JS, CSS, etc.) - files with extensions in root
    if (FILE_EXTENSIONS.test(path) && !path.includes('/gradle/')) {
      const key = path.startsWith('/') ? path.slice(1) : path;
      const response = await serveR2Object(env, key, getContentType(path), 'public, max-age=31536000, immutable', isHead);

      if (response) {
        return addSecurityHeaders(response);
      }

      // Asset not found — return 404 instead of falling back to SPA
      return addSecurityHeaders(new Response('Not Found', { status: 404 }));
    }

    // Handle directory listings and file downloads for mirror content
    // Normalize path - ensure directories end with /
    if (!path.endsWith('/') && !FILE_EXTENSIONS.test(path)) {
      const key = path.startsWith('/') ? path.slice(1) : path;
      const response = await serveR2Object(env, key, getContentType(path), 'public, max-age=86400', isHead);

      if (response) {
        return addSecurityHeaders(response);
      }

      // It's likely a directory, redirect to add trailing slash
      return secureRedirect(`${url.origin}${path}/`);
    }

    // Directory listing
    if (path.endsWith('/')) {
      const prefix = path === '/' ? '' : path.slice(1);
      return addSecurityHeaders(await generateDirectoryListing(env, prefix, path), true);
    }

    // File download
    const key = path.startsWith('/') ? path.slice(1) : path;
    const response = await serveR2Object(env, key, getContentType(path), 'public, max-age=86400', isHead);

    if (!response) {
      return addSecurityHeaders(new Response('Not Found', { status: 404 }));
    }

    return addSecurityHeaders(response);
  },
};

async function serveFile(env: Env, key: string, contentType: string, isHead: boolean): Promise<Response> {
  if (isHead) {
    const head = await env.BUCKET.head(key);
    if (!head) return new Response('Not Found', { status: 404 });
    return new Response(null, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': head.size.toString(),
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const file = await env.BUCKET.get(key);
  if (!file) return new Response('Not Found', { status: 404 });

  return new Response(file.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function generateDirectoryListing(env: Env, prefix: string, displayPath: string): Promise<Response> {
  const listed = await env.BUCKET.list({ prefix, delimiter: '/' });

  const directories: string[] = [];
  const files: { name: string; size: number; modified: Date }[] = [];

  // Get directories (common prefixes)
  for (const prefix of listed.delimitedPrefixes) {
    const name = prefix.slice(prefix.slice(0, -1).lastIndexOf('/') + 1);
    directories.push(name);
  }

  // Get files
  for (const object of listed.objects) {
    // Skip if it's the "directory" itself
    if (object.key === prefix) continue;

    const name = object.key.slice(prefix.length);
    // Skip if this is in a subdirectory
    if (name.includes('/')) continue;

    files.push({
      name,
      size: object.size,
      modified: object.uploaded,
    });
  }

  // Sort reverse alphabetically
  directories.sort((a, b) => b.toLowerCase().localeCompare(a.toLowerCase()));
  files.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));

  const html = generateHTML(displayPath, directories, files);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

/**
 * Escapes a string for safe inclusion in HTML content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateHTML(
  path: string,
  directories: string[],
  files: { name: string; size: number; modified: Date }[]
): string {
  const parentPath = path === '/' ? null : path.split('/').slice(0, -2).join('/') + '/';
  const safePath = escapeHtml(path);

  let rows = '';

  // Parent directory link
  if (parentPath !== null) {
    rows += `
      <tr>
        <td class="icon">&#x1F4C1;</td>
        <td class="name"><a href="${escapeHtml(parentPath)}">..</a></td>
        <td class="size">-</td>
        <td class="modified">-</td>
      </tr>`;
  }

  // Directories
  for (const dir of directories) {
    const safeDir = escapeHtml(dir);
    rows += `
      <tr>
        <td class="icon">&#x1F4C1;</td>
        <td class="name"><a href="${safePath}${safeDir}">${safeDir}</a></td>
        <td class="size">-</td>
        <td class="modified">-</td>
      </tr>`;
  }

  // Files
  for (const file of files) {
    const safeName = escapeHtml(file.name);
    rows += `
      <tr>
        <td class="icon">&#x1F4C4;</td>
        <td class="name"><a href="${safePath}${safeName}">${safeName}</a></td>
        <td class="size">${formatSize(file.size)}</td>
        <td class="modified">${formatDate(file.modified)}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="/favicon.png">
  <title>Index of ${safePath}</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --fg: #e5e5e5;
      --accent: #ff2525;
      --border: #262626;
      --hover: #171717;
    }
    * { box-sizing: border-box; }
    body {
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
      background: var(--bg);
      color: var(--fg);
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0 0 1.5rem 0;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 a {
      color: var(--accent);
      text-decoration: none;
    }
    h1 a:hover {
      text-decoration: underline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid var(--border);
      font-weight: 500;
      color: #a3a3a3;
    }
    td {
      padding: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    tr:hover {
      background: var(--hover);
    }
    .icon { width: 30px; }
    .name { }
    .size { width: 100px; text-align: right; color: #a3a3a3; }
    .modified { width: 180px; text-align: right; color: #a3a3a3; }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 1rem;
      color: #a3a3a3;
    }
    .back-link:hover {
      color: var(--accent);
    }
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .size, .modified { display: none; }
      th.size, th.modified { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">&larr; Back to mirrors</a>
    <h1>Index of ${safePath}</h1>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th class="size">Size</th>
          <th class="modified">Modified</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.8rem; color: #a3a3a3;">
      <a href="https://github.com/Commit451/mirror" style="color: #a3a3a3;">See source</a>
    </footer>
  </div>
</body>
</html>`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    zip: 'application/zip',
    gz: 'application/gzip',
    tar: 'application/x-tar',
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml',
  };
  return types[ext || ''] || 'application/octet-stream';
}
