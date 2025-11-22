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

