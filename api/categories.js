import { getCategories } from '../lib/catalog.js';
import { methodNotAllowed, sendJson } from '../lib/api-response.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  sendJson(response, 200, getCategories());
}
