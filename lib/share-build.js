import { resolveProducts, summarizeBuild } from './catalog.js';

const shareIdPrefix = 'BL-';
const shareTokenPattern = /^[A-Za-z0-9_-]{1,1024}$/;

export function createSharedBuild(componentIds) {
  const products = resolveProducts(componentIds);
  if (!products.some((product) => product.category === 'case')) {
    throw Object.assign(new Error('Choose a case before sharing a build.'), { status: 422 });
  }

  const token = Buffer.from(JSON.stringify(products.map((product) => String(product.id)))).toString(
    'base64url',
  );
  return {
    id: `${shareIdPrefix}${token}`,
    ...summarizeBuild(products),
    createdAt: new Date().toISOString(),
  };
}

export function getSharedBuild(buildId) {
  if (typeof buildId !== 'string' || !buildId.startsWith(shareIdPrefix)) {
    throw Object.assign(new Error('Invalid build ID.'), { status: 400 });
  }

  const token = buildId.slice(shareIdPrefix.length);
  if (!shareTokenPattern.test(token)) {
    throw Object.assign(new Error('Invalid build ID.'), { status: 400 });
  }

  let componentIds;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    if (Buffer.from(json, 'utf8').toString('base64url') !== token) {
      throw new Error('Invalid build token.');
    }
    componentIds = JSON.parse(json);
  } catch {
    throw Object.assign(new Error('Invalid build ID.'), { status: 400 });
  }

  const products = resolveProducts(componentIds);
  if (!products.some((product) => product.category === 'case')) {
    throw Object.assign(new Error('The shared build does not include a case.'), { status: 400 });
  }

  return {
    id: buildId,
    ...summarizeBuild(products),
  };
}
