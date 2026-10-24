import categories from '../data/categories.json' with { type: 'json' };
import cases from '../data/case.json' with { type: 'json' };
import processors from '../data/cpu.json' with { type: 'json' };
import motherboards from '../data/motherboard.json' with { type: 'json' };
import graphicsCards from '../data/gpu.json' with { type: 'json' };
import memoryKits from '../data/ram.json' with { type: 'json' };
import storageDevices from '../data/storage.json' with { type: 'json' };
import powerSupplies from '../data/psu.json' with { type: 'json' };
import coolers from '../data/cooler.json' with { type: 'json' };

const categoryCatalogs = [
  cases,
  processors,
  motherboards,
  graphicsCards,
  memoryKits,
  storageDevices,
  powerSupplies,
  coolers,
];

export const catalog = {
  items: categoryCatalogs.flatMap((category) => category.items),
  currency: 'GBP',
  source: 'Local JSON catalog',
  updatedAt: new Date().toISOString().slice(0, 10),
  warnings: [],
};

const productById = new Map(catalog.items.map((product) => [String(product.id), product]));

export function getCategories() {
  return categories.map((category) => ({
    ...category,
    count: catalog.items.filter((product) => product.category === category.id).length,
  }));
}

export function listProducts({ category, query = '', sort } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  let products = catalog.items;

  if (category) {
    products = products.filter((product) => product.category === category);
  }
  if (normalizedQuery) {
    products = products.filter((product) =>
      `${product.name} ${product.brand} ${product.specs}`.toLowerCase().includes(normalizedQuery),
    );
  }
  if (sort === 'price-asc')
    products = [...products].sort((left, right) => left.price - right.price);
  if (sort === 'price-desc')
    products = [...products].sort((left, right) => right.price - left.price);

  return products;
}

export function resolveProducts(componentIds) {
  if (!Array.isArray(componentIds) || componentIds.length > categories.length) {
    throw Object.assign(new Error('Choose up to eight known components.'), { status: 400 });
  }

  const selectedCategories = new Set();
  const products = componentIds.map((id) => {
    if (typeof id !== 'string' || !productById.has(id)) {
      throw Object.assign(new Error('The build contains an unknown component.'), { status: 400 });
    }

    const product = productById.get(id);
    if (selectedCategories.has(product.category)) {
      throw Object.assign(new Error(`Only one ${product.category} can be selected.`), {
        status: 400,
      });
    }
    selectedCategories.add(product.category);
    return product;
  });

  return products;
}

export function checkCompatibility(products) {
  const warnings = [];
  const invalidSlots = new Set();
  const get = (category) => products.find((product) => product.category === category);
  const cpu = get('cpu');
  const motherboard = get('motherboard');
  const gpu = get('gpu');
  const computerCase = get('case');
  const cooler = get('cooler');
  const memory = get('ram');
  const powerSupply = get('psu');

  if (!computerCase) warnings.push('Choose a case first to start your build.');
  if (cpu && motherboard && cpu.socket !== motherboard.socket) {
    warnings.push(`CPU uses ${cpu.socket}; motherboard uses ${motherboard.socket}.`);
    invalidSlots.add('cpu');
    invalidSlots.add('motherboard');
  }
  if (
    motherboard &&
    computerCase &&
    !computerCase.supportedFormFactors?.includes(motherboard.formFactor)
  ) {
    warnings.push(`${motherboard.formFactor} motherboard does not fit this case.`);
    invalidSlots.add('motherboard');
    invalidSlots.add('case');
  }
  if (gpu && computerCase && gpu.length > computerCase.maxGpuLength) {
    warnings.push(
      `Graphics card is ${gpu.length} mm; case clearance is ${computerCase.maxGpuLength} mm.`,
    );
    invalidSlots.add('gpu');
    invalidSlots.add('case');
  }
  if (cooler && computerCase && cooler.height > computerCase.maxCoolerHeight) {
    warnings.push(
      `CPU cooler is ${cooler.height} mm; case clearance is ${computerCase.maxCoolerHeight} mm.`,
    );
    invalidSlots.add('cooler');
    invalidSlots.add('case');
  }
  if (memory && motherboard && memory.memoryType !== motherboard.memoryType) {
    warnings.push(`${memory.memoryType} memory is not supported by this motherboard.`);
    invalidSlots.add('ram');
    invalidSlots.add('motherboard');
  }
  if (cooler && cpu && !cooler.supportedSockets?.includes(cpu.socket)) {
    warnings.push(`CPU cooler does not support ${cpu.socket}.`);
    invalidSlots.add('cpu');
    invalidSlots.add('cooler');
  }

  const powerDraw = products.reduce((total, product) => total + (Number(product.wattage) || 0), 0);
  if (powerSupply && powerDraw > powerSupply.capacity * 0.9) {
    warnings.push(`Estimated power draw (${powerDraw} W) is too high for the selected PSU.`);
    invalidSlots.add('psu');
  }

  return {
    warnings,
    invalidSlots: [...invalidSlots],
    compatible: warnings.length === 0,
    powerDraw,
    recommendedPsu: Math.ceil((powerDraw * 1.35) / 50) * 50,
  };
}

export function summarizeBuild(products) {
  const compatibility = checkCompatibility(products);

  return {
    components: products.map((product) => product.id),
    parts: products.map((product) => ({
      ...product,
      productId: product.id,
      slot: product.category,
    })),
    total: products.reduce((total, product) => total + product.price, 0),
    power: {
      draw: compatibility.powerDraw,
      recommended: compatibility.recommendedPsu,
    },
    compatibility: {
      compatible: compatibility.compatible,
      warnings: compatibility.warnings,
      invalidSlots: compatibility.invalidSlots,
    },
  };
}
