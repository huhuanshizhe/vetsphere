import { useEffect, useState } from 'react';
import { getIntlProductPrimaryImageMap } from '../services/intl-api';

export function useIntlCartProductImageMap(productIds: Array<string | null | undefined>) {
  const [productImageMap, setProductImageMap] = useState<Record<string, string>>({});
  const uniqueProductIds = Array.from(
    new Set(productIds.filter((productId): productId is string => Boolean(productId?.trim()))),
  );
  const productIdsKey = uniqueProductIds.join('|');

  useEffect(() => {
    let cancelled = false;

    if (uniqueProductIds.length === 0) {
      setProductImageMap({});
      return () => {
        cancelled = true;
      };
    }

    void getIntlProductPrimaryImageMap(uniqueProductIds)
      .then((imageMap) => {
        if (!cancelled) {
          setProductImageMap(imageMap);
        }
      })
      .catch((error) => {
        console.error('Failed to resolve cart product images:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  return productImageMap;
}