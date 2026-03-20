type FeaturedRecord = {
  featured?: boolean;
};

const DEFAULT_FEATURED_TIMESTAMP_KEYS = [
  "featuredAt",
  "pinnedAt",
  "updatedAt",
  "createdAt",
  "postedAt",
  "publishedAt",
  "date",
  "startDate",
  "order",
];

const DEFAULT_RECENCY_KEYS = [
  "createdAt",
  "postedAt",
  "publishedAt",
  "updatedAt",
  "date",
  "startDate",
  "order",
];

function normalizeKey(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function readTimestamp(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value !== "object" || value === null) {
    return 0;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.toDate === "function") {
    const date = (record.toDate as () => Date)();
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  if (typeof record.seconds === "number") {
    return record.seconds * 1000;
  }

  if (typeof record._seconds === "number") {
    return record._seconds * 1000;
  }

  return 0;
}

export function getItemTimestamp<T extends FeaturedRecord>(
  item: T,
  keys: string[] = DEFAULT_RECENCY_KEYS,
): number {
  for (const key of keys) {
    const timestamp = readTimestamp((item as Record<string, unknown>)[key]);
    if (timestamp > 0) {
      return timestamp;
    }
  }

  return 0;
}

export function getFeaturedPriorityTimestamp<T extends FeaturedRecord>(
  item: T,
  featuredKeys: string[] = DEFAULT_FEATURED_TIMESTAMP_KEYS,
  recencyKeys: string[] = DEFAULT_RECENCY_KEYS,
): number {
  const featuredTimestamp = getItemTimestamp(item, featuredKeys);
  if (featuredTimestamp > 0) {
    return featuredTimestamp;
  }

  return getItemTimestamp(item, recencyKeys);
}

export function sortByRecency<T extends FeaturedRecord>(
  items: T[],
  recencyKeys: string[] = DEFAULT_RECENCY_KEYS,
): T[] {
  return [...items].sort((left, right) => (
    getItemTimestamp(right, recencyKeys) - getItemTimestamp(left, recencyKeys)
  ));
}

export function sortFeaturedByPriority<T extends FeaturedRecord>(
  items: T[],
  options?: {
    featuredKeys?: string[];
    recencyKeys?: string[];
  },
): T[] {
  const featuredKeys = options?.featuredKeys ?? DEFAULT_FEATURED_TIMESTAMP_KEYS;
  const recencyKeys = options?.recencyKeys ?? DEFAULT_RECENCY_KEYS;

  return [...items].sort((left, right) => {
    const featuredDelta = (
      getFeaturedPriorityTimestamp(right, featuredKeys, recencyKeys)
      - getFeaturedPriorityTimestamp(left, featuredKeys, recencyKeys)
    );

    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    return getItemTimestamp(right, recencyKeys) - getItemTimestamp(left, recencyKeys);
  });
}

export function selectFeaturedStripItems<T extends FeaturedRecord>(
  items: T[],
  options: {
    maxItems: number;
    getOrgKey: (item: T) => string | undefined | null;
    featuredKeys?: string[];
    recencyKeys?: string[];
  },
): T[] {
  const ranked = sortFeaturedByPriority(
    items.filter((item) => Boolean(item.featured)),
    {
      featuredKeys: options.featuredKeys,
      recencyKeys: options.recencyKeys,
    },
  );

  const selected: T[] = [];
  const usedOrgs = new Set<string>();

  for (const item of ranked) {
    if (selected.length >= options.maxItems) {
      break;
    }

    const orgKey = normalizeKey(options.getOrgKey(item));
    if (orgKey && usedOrgs.has(orgKey)) {
      continue;
    }

    selected.push(item);
    if (orgKey) {
      usedOrgs.add(orgKey);
    }
  }

  return selected;
}

export function selectFeaturedOpportunityItems<T extends FeaturedRecord>(
  items: T[],
  options: {
    maxItems: number;
    getOrgKey: (item: T) => string | undefined | null;
    getTypeKey: (item: T) => string | undefined | null;
    featuredKeys?: string[];
    recencyKeys?: string[];
  },
): T[] {
  const ranked = sortFeaturedByPriority(
    items.filter((item) => Boolean(item.featured)),
    {
      featuredKeys: options.featuredKeys,
      recencyKeys: options.recencyKeys,
    },
  );

  const selected: T[] = [];
  const selectedIndexes = new Set<number>();
  const usedOrgs = new Set<string>();
  const usedTypes = new Set<string>();

  const trySelect = (predicate: (item: T) => boolean) => {
    for (const [index, item] of ranked.entries()) {
      if (selected.length >= options.maxItems) {
        break;
      }

      if (selectedIndexes.has(index) || !predicate(item)) {
        continue;
      }

      selected.push(item);
      selectedIndexes.add(index);

      const orgKey = normalizeKey(options.getOrgKey(item));
      const typeKey = normalizeKey(options.getTypeKey(item));

      if (orgKey) {
        usedOrgs.add(orgKey);
      }
      if (typeKey) {
        usedTypes.add(typeKey);
      }
    }
  };

  trySelect((item) => {
    const orgKey = normalizeKey(options.getOrgKey(item));
    const typeKey = normalizeKey(options.getTypeKey(item));

    if (orgKey && usedOrgs.has(orgKey)) {
      return false;
    }

    if (typeKey && usedTypes.has(typeKey)) {
      return false;
    }

    return true;
  });

  trySelect((item) => {
    const orgKey = normalizeKey(options.getOrgKey(item));
    return !orgKey || !usedOrgs.has(orgKey);
  });

  trySelect(() => true);

  return selected;
}

function buildFeaturedPositions(options: {
  featuredCount: number;
  finalLength: number;
  leadingRegularCount: number;
  firstWindowSize: number;
  maxFeaturedInFirstWindow: number;
}): number[] {
  const positions: number[] = [];

  for (let index = 0; index < options.featuredCount; index += 1) {
    const remainingFeatured = options.featuredCount - index - 1;
    const idealPosition = Math.round(((index + 1) * options.finalLength) / (options.featuredCount + 1));
    const minPosition = positions.length === 0
      ? options.leadingRegularCount
      : positions[positions.length - 1] + 2;

    let maxPosition = options.finalLength - 1 - (remainingFeatured * 2);
    let position = Math.max(idealPosition, minPosition);

    const featuredAlreadyInWindow = positions.filter((value) => value < options.firstWindowSize).length;
    if (position < options.firstWindowSize && featuredAlreadyInWindow >= options.maxFeaturedInFirstWindow) {
      position = Math.max(position, options.firstWindowSize);
    }

    if (maxPosition < minPosition) {
      maxPosition = options.finalLength - 1 - remainingFeatured;
    }

    if (position > maxPosition) {
      position = maxPosition;
    }

    if (position < minPosition) {
      position = minPosition;
    }

    positions.push(position);
  }

  return positions;
}

export function mixJobsForBrowse<T extends FeaturedRecord>(
  items: T[],
  options?: {
    recencyKeys?: string[];
    leadingRegularCount?: number;
    firstWindowSize?: number;
    maxFeaturedInFirstWindow?: number;
  },
): T[] {
  const recencyKeys = options?.recencyKeys ?? DEFAULT_RECENCY_KEYS;
  const featured = sortByRecency(items.filter((item) => Boolean(item.featured)), recencyKeys);
  const regular = sortByRecency(items.filter((item) => !item.featured), recencyKeys);

  if (featured.length === 0 || regular.length === 0) {
    return sortByRecency(items, recencyKeys);
  }

  const positions = new Set(
    buildFeaturedPositions({
      featuredCount: featured.length,
      finalLength: items.length,
      leadingRegularCount: Math.min(options?.leadingRegularCount ?? 2, regular.length),
      firstWindowSize: options?.firstWindowSize ?? 12,
      maxFeaturedInFirstWindow: options?.maxFeaturedInFirstWindow ?? 2,
    }),
  );

  const result: T[] = [];
  let featuredIndex = 0;
  let regularIndex = 0;

  for (let index = 0; index < items.length; index += 1) {
    if (positions.has(index) && featuredIndex < featured.length) {
      result.push(featured[featuredIndex]);
      featuredIndex += 1;
      continue;
    }

    if (regularIndex < regular.length) {
      result.push(regular[regularIndex]);
      regularIndex += 1;
      continue;
    }

    if (featuredIndex < featured.length) {
      result.push(featured[featuredIndex]);
      featuredIndex += 1;
    }
  }

  return result;
}

export function sortByRecencyWithFeaturedBoost<T extends FeaturedRecord>(
  items: T[],
  options?: {
    recencyKeys?: string[];
    featuredKeys?: string[];
    boostMs?: number;
  },
): T[] {
  const recencyKeys = options?.recencyKeys ?? DEFAULT_RECENCY_KEYS;
  const featuredKeys = options?.featuredKeys ?? DEFAULT_FEATURED_TIMESTAMP_KEYS;
  const boostMs = options?.boostMs ?? 18 * 60 * 60 * 1000;

  return [...items].sort((left, right) => {
    const leftRecency = getItemTimestamp(left, recencyKeys);
    const rightRecency = getItemTimestamp(right, recencyKeys);
    const leftScore = leftRecency + (left.featured ? boostMs : 0);
    const rightScore = rightRecency + (right.featured ? boostMs : 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    if (rightRecency !== leftRecency) {
      return rightRecency - leftRecency;
    }

    return (
      getFeaturedPriorityTimestamp(right, featuredKeys, recencyKeys)
      - getFeaturedPriorityTimestamp(left, featuredKeys, recencyKeys)
    );
  });
}
