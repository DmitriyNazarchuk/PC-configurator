import { getSharedBuild } from '../../lib/share-build.js';
import { methodNotAllowed, sendApiError, sendJson } from '../../lib/api-response.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    sendJson(response, 200, getSharedBuild(request.query.id));
  } catch (error) {
    sendApiError(response, error);
  }
}
