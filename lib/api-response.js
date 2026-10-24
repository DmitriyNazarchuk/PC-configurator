export function sendJson(response, statusCode, payload) {
  response.status(statusCode);
  response.setHeader('Cache-Control', 'no-store');
  response.json(payload);
}

export function methodNotAllowed(response, allowedMethods) {
  response.setHeader('Allow', allowedMethods.join(', '));
  sendJson(response, 405, { error: `Use ${allowedMethods.join(' or ')} for this endpoint.` });
}

export async function readJsonBody(request, maximumBytes = 16 * 1024) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body) > maximumBytes) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
    try {
      return JSON.parse(request.body || '{}');
    } catch {
      throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
    }
  }

  const chunks = [];
  let bodySize = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bodySize += buffer.length;
    if (bodySize > maximumBytes) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

export function sendApiError(response, error) {
  const statusCode = Number.isInteger(error?.status) ? error.status : 500;
  if (statusCode >= 500) console.error('Vercel API request failed:', error);
  sendJson(response, statusCode, {
    error: statusCode >= 500 ? 'Unexpected server error.' : error.message,
  });
}
