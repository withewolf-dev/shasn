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

  const resourceOrder: ResourceType[] = ['funds', 'media', 'clout', 'trust'];
  const updated: ResourceBundle = { ...normalized };

  for (const type of resourceOrder) {
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

