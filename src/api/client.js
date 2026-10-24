export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }
  return payload;
}

export function fetchCatalog(signal) {
  return requestJson('/api/components', { signal });
}

export function fetchComponentOptions({ category, ids, query, signal }) {
  const params = new URLSearchParams({
    category,
    ids: ids.join(','),
    q: query,
  });
  return requestJson(`/api/components?${params}`, { signal });
}

export function requestBuildCheck(productIds, signal) {
  return requestJson('/api/builds/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
    signal,
  });
}

export function saveBuild(componentIds, signal) {
  return requestJson('/api/builds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ components: componentIds }),
    signal,
  });
}

export function fetchBuild(buildId, signal) {
  return requestJson(`/api/builds/${encodeURIComponent(buildId)}`, { signal });
}
