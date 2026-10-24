import { createSharedBuild } from '../../lib/share-build.js';
import { methodNotAllowed, readJsonBody, sendApiError, sendJson } from '../../lib/api-response.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const payload = await readJsonBody(request);
    const build = createSharedBuild(payload.components);
    sendJson(response, 201, build);
  } catch (error) {
    sendApiError(response, error);
  }
}
