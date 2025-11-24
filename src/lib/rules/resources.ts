import type { ResourceBundle, ResourceType } from './types';

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  funds: 'Funds',
  media: 'Media',
  clout: 'Clout',
  trust: 'Trust',
};

export const RESOURCE_CAP = 12;

export function normalizeResourceBundle(bundle?: ResourceBundle | null): ResourceBundle {
  if (!bundle) return {};
  return Object.fromEntries(
    Object.entries(bundle).map(([key, value]) => [key, typeof value === 'number' ? value : Number(value)]) as [
      ResourceType,
      number,
    ][],
  );
}

const RESOURCE_ORDER: ResourceType[] = ['funds', 'media', 'clout', 'trust'];

export function addResourceBundles(base: ResourceBundle, delta: ResourceBundle): ResourceBundle {
  const normalizedBase = normalizeResourceBundle(base);
  const normalizedDelta = normalizeResourceBundle(delta);

  return Object.entries(normalizedDelta).reduce<ResourceBundle>((acc, [key, value]) => {
    const typedKey = key as ResourceType;
    acc[typedKey] = (acc[typedKey] ?? 0) + (value ?? 0);
    return acc;
  }, { ...normalizedBase });
}

export function hasSufficientResources(base: ResourceBundle, cost: ResourceBundle): boolean {
  const normalizedBase = normalizeResourceBundle(base);
  const normalizedCost = normalizeResourceBundle(cost);

  return Object.entries(normalizedCost).every(([key, value]) => {
    const typedKey = key as ResourceType;
    return (normalizedBase[typedKey] ?? 0) >= (value ?? 0);
  });
}

export function subtractResourceBundle(base: ResourceBundle, cost: ResourceBundle): ResourceBundle {
  if (!hasSufficientResources(base, cost)) {
    throw new Error('Insufficient resources to complete this action.');
  }

  const normalizedBase = normalizeResourceBundle(base);
  const normalizedCost = normalizeResourceBundle(cost);

  return Object.entries(normalizedCost).reduce<ResourceBundle>((acc, [key, value]) => {
    const typedKey = key as ResourceType;
    acc[typedKey] = (acc[typedKey] ?? 0) - (value ?? 0);
    return acc;
  }, { ...normalizedBase });
}

export function totalResources(bundle?: ResourceBundle | null): number {
  if (!bundle) return 0;
  return Object.values(bundle).reduce((sum, value) => sum + (value ?? 0), 0);
}

export function spendGenericResources(base: ResourceBundle, amount: number): ResourceBundle {
  const normalized = normalizeResourceBundle(base);
  let remaining = amount;

  const updated: ResourceBundle = { ...normalized };

  for (const type of RESOURCE_ORDER) {
    if (remaining <= 0) break;
    const available = updated[type] ?? 0;
    if (available <= 0) continue;
    const spend = Math.min(available, remaining);
    updated[type] = available - spend;
    remaining -= spend;
  }

  if (remaining > 0) {
    throw new Error('Insufficient resources to cover cost.');
  }

  return updated;
}

export function clampResourceBundle(bundle: ResourceBundle): {
  bundle: ResourceBundle;
  discarded: ResourceBundle;
  overflow: number;
} {
  const normalized = normalizeResourceBundle(bundle);
  const total = totalResources(normalized);
  const overflow = Math.max(0, total - RESOURCE_CAP);
  if (overflow <= 0) {
    return { bundle: normalized, discarded: {}, overflow: 0 };
  }

  let remainingOverflow = overflow;
  const discarded: ResourceBundle = {};
  const updated: ResourceBundle = { ...normalized };

  const sortedResources = [...RESOURCE_ORDER].sort(
    (a, b) => (updated[b] ?? 0) - (updated[a] ?? 0),
  );

  while (remainingOverflow > 0) {
    for (const resource of sortedResources) {
      if (remainingOverflow <= 0) break;
      const available = updated[resource] ?? 0;
      if (available <= 0) continue;
      const amount = Math.min(available, remainingOverflow);
      updated[resource] = available - amount;
      discarded[resource] = (discarded[resource] ?? 0) + amount;
      remainingOverflow -= amount;
    }
    if (sortedResources.every((resource) => (updated[resource] ?? 0) === 0)) {
      break;
    }
  }

  return { bundle: updated, discarded, overflow };
}

