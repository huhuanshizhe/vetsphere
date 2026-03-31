/**
 * 国家代码到货币的映射配置
 * 基于 ISO 3166-1 alpha-2 国家代码
 */
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // 亚洲
  'JP': 'JPY',  // 日本
  'TH': 'THB',  // 泰国
  'CN': 'CNY',  // 中国
  'HK': 'HKD',  // 香港
  'TW': 'TWD',  // 台湾
  'SG': 'SGD',  // 新加坡
  'MY': 'MYR',  // 马来西亚
  'ID': 'IDR',  // 印度尼西亚
  'PH': 'PHP',  // 菲律宾
  'VN': 'VND',  // 越南
  'KR': 'KRW',  // 韩国
  'IN': 'INR',  // 印度

  // 北美
  'US': 'USD',  // 美国
  'CA': 'CAD',  // 加拿大
  'MX': 'MXN',  // 墨西哥

  // 南美
  'BR': 'BRL',  // 巴西
  'AR': 'ARS',  // 阿根廷
  'CL': 'CLP',  // 智利
  'CO': 'COP',  // 哥伦比亚
  'PE': 'PEN',  // 秘鲁

  // 欧洲
  'GB': 'GBP',  // 英国
  'DE': 'EUR',  // 德国
  'FR': 'EUR',  // 法国
  'IT': 'EUR',  // 意大利
  'ES': 'EUR',  // 西班牙
  'NL': 'EUR',  // 荷兰
  'BE': 'EUR',  // 比利时
  'AT': 'EUR',  // 奥地利
  'CH': 'CHF',  // 瑞士
  'PL': 'PLN',  // 波兰
  'SE': 'SEK',  // 瑞典
  'DK': 'DKK',  // 丹麦
  'NO': 'NOK',  // 挪威
  'FI': 'EUR',  // 芬兰
  'IE': 'EUR',  // 爱尔兰
  'PT': 'EUR',  // 葡萄牙
  'CZ': 'CZK',  // 捷克
  'HU': 'HUF',  // 匈牙利
  'RO': 'RON',  // 罗马尼亚
  'BG': 'BGN',  // 保加利亚
  'HR': 'EUR',  // 克罗地亚
  'SK': 'EUR',  // 斯洛伐克
  'SI': 'EUR',  // 斯洛文尼亚
  'LT': 'EUR',  // 立陶宛
  'LV': 'EUR',  // 拉脱维亚
  'EE': 'EUR',  // 爱沙尼亚
  'GR': 'EUR',  // 希腊
  'LU': 'EUR',  // 卢森堡
  'RU': 'RUB',  // 俄罗斯

  // 大洋洲
  'AU': 'AUD',  // 澳大利亚
  'NZ': 'NZD',  // 新西兰

  // 中东
  'AE': 'AED',  // 阿联酋
  'SA': 'SAR',  // 沙特阿拉伯
  'IL': 'ILS',  // 以色列
  'TR': 'TRY',  // 土耳其

  // 非洲
  'ZA': 'ZAR',  // 南非
  'EG': 'EGP',  // 埃及
  'NG': 'NGN',  // 尼日利亚
  'KE': 'KES',  // 肯尼亚
};

/**
 * 获取国家对应的货币代码
 */
export function getCountryCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
}
