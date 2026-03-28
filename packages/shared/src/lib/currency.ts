/**
 * 货币工具函数
 */

export type Currency = 'CNY' | 'USD' | 'JPY' | 'THB';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CNY: '¥',
  USD: '$',
  JPY: '¥',
  THB: '฿',
};

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  CNY: 2,
  USD: 2,
  JPY: 0,  // 日元没有小数
  THB: 2,
};

/**
 * 根据locale获取对应货币
 */
export function getLocaleCurrency(locale: string): Currency {
  switch (locale) {
    case 'zh':
    case 'cn':
      return 'CNY';
    case 'ja':
      return 'JPY';
    case 'th':
      return 'THB';
    case 'en':
    default:
      return 'USD';
  }
}

/**
 * 格式化价格
 */
export function formatPrice(price: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const decimals = CURRENCY_DECIMALS[currency];
  
  if (currency === 'JPY') {
    return `${symbol}${Math.round(price).toLocaleString()}`;
  }
  
  return `${symbol}${price.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/**
 * 获取货币名称
 */
export function getCurrencyName(currency: Currency): string {
  const names: Record<Currency, string> = {
    CNY: 'Chinese Yuan',
    USD: 'US Dollar',
    JPY: 'Japanese Yen',
    THB: 'Thai Baht',
  };
  return names[currency];
}