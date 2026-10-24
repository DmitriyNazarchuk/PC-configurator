import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalog,
  getCategories,
  listProducts,
  resolveProducts,
  summarizeBuild,
} from './lib/catalog.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const distributionDirectory = resolve(projectRoot, 'dist');
const caseModelsDirectory = resolve(projectRoot, 'models/cases');
const savedBuildsDirectory = resolve(projectRoot, 'storage');
const savedBuildsPath = join(savedBuildsDirectory, 'builds.json');
const maximumRequestBytes = 16 * 1024;
const buildIdPattern = /^BL-[A-F0-9]{8}$/;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
};
const savedBuilds = await loadSavedBuilds();

async function loadSavedBuilds() {
  try {
    const content = await readFile(savedBuildsPath, 'utf8');
    const records = JSON.parse(content);
    if (!Array.isArray(records)) throw new Error('Saved builds must be a JSON array.');

    const validBuilds = new Map();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !buildIdPattern.test(record.id)) continue;
      try {
        const products = resolveProducts(record.components);
        if (!products.some((product) => product.category === 'case')) continue;
        validBuilds.set(record.id, {
          id: record.id,
          ...summarizeBuild(products),
          createdAt:
            typeof record.createdAt === 'string' ? record.createdAt : new Date(0).toISOString(),
        });
      } catch {
        // Ignore invalid or outdated records and keep serving the remaining saved builds.
      }
    }
    return validBuilds;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not load persisted builds:', error);
    }
    return new Map();
  }
}

async function persistSavedBuilds() {
  await mkdir(savedBuildsDirectory, { recursive: true });
  const temporaryPath = `${savedBuildsPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, JSON.stringify([...savedBuilds.values()], null, 2));
  await rename(temporaryPath, savedBuildsPath);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(payload));
}

async function readJsonRequest(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maximumRequestBytes) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

async function serveCaseModel(request, response, pathname) {
  try {
    const filename = decodeURIComponent(pathname.slice('/models/cases/'.length));
    if (!filename || filename.includes('/') || filename.includes('\\')) {
      return sendJson(response, 400, { error: 'Invalid model path.' });
    }
    const target = resolve(caseModelsDirectory, filename);
    const allowedExtensions = ['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp'];
    if (
      !target.startsWith(caseModelsDirectory + sep) ||
      !allowedExtensions.includes(extname(target).toLowerCase())
    ) {
      return sendJson(response, 403, { error: 'Forbidden.' });
    }
    const fileInfo = await stat(target);
    if (!fileInfo.isFile()) return sendJson(response, 404, { error: 'Model not found.' });

    const isBinaryGltf = extname(target).toLowerCase() === '.glb';
    const acceptsGzip = (request.headers['accept-encoding'] || '').includes('gzip');
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
      ...(isBinaryGltf && acceptsGzip
        ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' }
        : { 'Content-Length': fileInfo.size }),
      'Cache-Control': 'public, max-age=86400',
    });
    const fileStream = createReadStream(target);
    return isBinaryGltf && acceptsGzip
      ? fileStream.pipe(createGzip({ level: 6 })).pipe(response)
      : fileStream.pipe(response);
  } catch {
    return sendJson(response, 404, { error: 'Model not found.' });
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, 'http://localhost');
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return response.end();
  }
  if (url.pathname.startsWith('/models/cases/')) {
    return serveCaseModel(request, response, url.pathname);
  }
  if (url.pathname === '/api/health') {
    return sendJson(response, 200, {
      ok: true,
      service: 'buildlab-api',
      version: '3.0.0',
      catalog: 'local-json',
    });
  }
  if (url.pathname === '/api/categories') {
    return sendJson(response, 200, getCategories());
  }
  if (url.pathname === '/api/components') {
    const products = listProducts({
      category: url.searchParams.get('category') || undefined,
      query: url.searchParams.get('q') || '',
      sort: url.searchParams.get('sort') || undefined,
    });
    return sendJson(response, 200, {
      items: products,
      total: products.length,
      currency: catalog.currency,
      updatedAt: catalog.updatedAt,
      source: catalog.source,
      warnings: catalog.warnings,
    });
  }
  if (url.pathname === '/api/builds/check' && request.method === 'POST') {
    try {
      const payload = await readJsonRequest(request);
      const products = resolveProducts(payload.productIds || []);
      const summary = summarizeBuild(products);
      return sendJson(response, 200, { ...summary, source: 'local' });
    } catch (error) {
      return sendJson(response, error.status || 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/builds' && request.method === 'POST') {
    try {
      const payload = await readJsonRequest(request);
      const products = resolveProducts(payload.components);
      if (!products.some((product) => product.category === 'case')) {
        return sendJson(response, 422, { error: 'Choose a case before saving a build.' });
      }
      const id = `BL-${randomBytes(4).toString('hex').toUpperCase()}`;
      const build = {
        id,
        ...summarizeBuild(products),
        createdAt: new Date().toISOString(),
      };
      savedBuilds.set(id, build);
      try {
        await persistSavedBuilds();
      } catch (error) {
        savedBuilds.delete(id);
        console.error('Could not persist the shared build:', error);
        return sendJson(response, 500, { error: 'Could not save this build.' });
      }
      return sendJson(response, 201, build);
    } catch (error) {
      return sendJson(response, error.status || 400, { error: error.message });
    }
  }
  if (url.pathname.startsWith('/api/builds/')) {
    const buildId = url.pathname.slice('/api/builds/'.length);
    if (!buildIdPattern.test(buildId))
      return sendJson(response, 400, { error: 'Invalid build ID.' });
    const build = savedBuilds.get(buildId);
    return build
      ? sendJson(response, 200, build)
      : sendJson(response, 404, { error: 'Build not found.' });
  }
  if (url.pathname.startsWith('/api/')) {
    return sendJson(response, 404, { error: 'API route not found.' });
  }

  return serveStaticFile(response, url.pathname);
}

async function serveStaticFile(response, pathname) {
  try {
    const target =
      pathname === '/'
        ? join(distributionDirectory, 'index.html')
        : resolve(distributionDirectory, `.${decodeURIComponent(pathname)}`);
    if (target !== distributionDirectory && !target.startsWith(distributionDirectory + sep)) {
      return sendJson(response, 403, { error: 'Forbidden.' });
    }

    try {
      const content = await readFile(target);
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
        'Cache-Control':
          extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      return response.end(content);
    } catch {
      if (extname(pathname)) return sendJson(response, 404, { error: 'File not found.' });
      const appShell = await readFile(join(distributionDirectory, 'index.html'));
      response.writeHead(200, { 'Content-Type': mimeTypes['.html'], 'Cache-Control': 'no-cache' });
      return response.end(appShell);
    }
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Build not found. Run: pnpm build');
  }
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error('Request handler failed:', error);
    if (!response.headersSent) sendJson(response, 500, { error: 'Unexpected server error.' });
    else response.destroy(error);
  });
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  console.log(`BuildLab API listening at http://${host}:${port}`);
});
