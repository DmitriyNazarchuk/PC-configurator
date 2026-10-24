import { catalog, listProducts } from '../lib/catalog.js';
import { methodNotAllowed, sendJson } from '../lib/api-response.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  const category = typeof request.query.category === 'string' ? request.query.category : undefined;
  const query = typeof request.query.q === 'string' ? request.query.q : '';
  const sort = typeof request.query.sort === 'string' ? request.query.sort : undefined;
  const items = listProducts({ category, query, sort });

  sendJson(response, 200, {
    items,
    total: items.length,
    currency: catalog.currency,
    updatedAt: catalog.updatedAt,
    source: catalog.source,
    warnings: catalog.warnings,
  });
}
