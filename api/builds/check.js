import { resolveProducts, summarizeBuild } from '../../lib/catalog.js';
import { methodNotAllowed, readJsonBody, sendApiError, sendJson } from '../../lib/api-response.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const payload = await readJsonBody(request);
    const products = resolveProducts(payload.productIds || []);
    sendJson(response, 200, { ...summarizeBuild(products), source: 'local' });
  } catch (error) {
    sendApiError(response, error);
  }
}
