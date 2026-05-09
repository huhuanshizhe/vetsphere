export type ProductImageType = 'main' | 'detail';

export type ProductImagePayload = {
  id?: string;
  url: string;
  type: ProductImageType;
  sort_order: number;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isProductImageType(value: unknown): value is ProductImageType {
  return value === 'main' || value === 'detail';
}

function toSortOrder(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export function normalizeProductImagesInput(
  images: unknown,
  fallbackMainUrl?: unknown,
): ProductImagePayload[] {
  const normalizedImages = Array.isArray(images)
    ? images
        .map((image, index) => {
          if (!image || typeof image !== 'object') return null;

          const imageRecord = image as Record<string, unknown>;
          const url = normalizeString(imageRecord.url);
          if (!url) return null;

          return {
            id: normalizeString(imageRecord.id) || undefined,
            url,
            type: isProductImageType(imageRecord.type) ? imageRecord.type : 'detail',
            sort_order: toSortOrder(imageRecord.sort_order ?? imageRecord.sortOrder, index),
          } satisfies ProductImagePayload;
        })
        .filter(Boolean) as ProductImagePayload[]
    : [];

  if (normalizedImages.length === 0) {
    const fallbackUrl = normalizeString(fallbackMainUrl);
    return fallbackUrl
      ? [
          {
            url: fallbackUrl,
            type: 'main',
            sort_order: 0,
          },
        ]
      : [];
  }

  let mainAssigned = false;
  const nextImages = normalizedImages.map((image, index) => {
    const shouldBeMain = image.type === 'main' && !mainAssigned;
    if (shouldBeMain) {
      mainAssigned = true;
    }

    return {
      ...image,
      type: shouldBeMain ? 'main' : 'detail',
      sort_order: index,
    } satisfies ProductImagePayload;
  });

  if (!mainAssigned) {
    nextImages[0] = {
      ...nextImages[0],
      type: 'main',
      sort_order: 0,
    };
  }

  return nextImages.map((image, index) => ({
    ...image,
    sort_order: index,
  }));
}

export function getMainProductImage(images: ProductImagePayload[]): ProductImagePayload | null {
  return images.find((image) => image.type === 'main') || null;
}

export function createProductImageRows(productId: string, images: ProductImagePayload[]) {
  return images.map((image, index) => ({
    product_id: productId,
    url: image.url,
    type: image.type,
    sort_order: toSortOrder(image.sort_order, index),
  }));
}