/**
 * Geolocation-based language detection service
 * Detects user's location and maps it to appropriate language
 */

export interface GeoLocationResult {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
}

/**
 * Map of country codes to supported languages
 * Priority: zh > en > th > ja
 */
const COUNTRY_TO_LANG: Record<string, string> = {
  // Chinese-speaking regions
  CN: 'zh',    // China
  TW: 'zh',    // Taiwan
  HK: 'zh',    // Hong Kong
  MO: 'zh',    // Macau
  SG: 'zh',    // Singapore (predominantly Chinese)

  // English-speaking regions (US, UK, etc.)
  US: 'en',    // United States
  GB: 'en',    // United Kingdom
  AU: 'en',    // Australia
  CA: 'en',    // Canada
  NZ: 'en',    // New Zealand
  IE: 'en',    // Ireland
  ZA: 'en',    // South Africa
  PH: 'en',    // Philippines (official language)
  IN: 'en',    // India (official language)
  MY: 'en',    // Malaysia (official language)

  // Thailand
  TH: 'th',    // Thailand

  // Japan
  JP: 'ja',    // Japan

  // Other regions (default to English)
};

/**
 * Default language fallback
 */
const DEFAULT_LANGUAGE = 'zh';

/**
 * Get language from browser settings
 * This is a fast client-side check that doesn't require API calls
 */
export function getLanguageFromBrowser(supportedLanguages: readonly string[] = ['zh', 'en', 'th']): string | null {
  if (typeof window === 'undefined') return null;

  const browserLang = navigator.language || (navigator as any).userLanguage;

  if (!browserLang) return null;

  // Extract language code (e.g., 'en' from 'en-US')
  const langCode = browserLang.split('-')[0].toLowerCase();

  if (supportedLanguages.includes(langCode)) {
    return langCode;
  }

  return null;
}

/**
 * Get language from time zone
 * This is another client-side check that doesn't require API calls
 */
export function getLanguageFromTimezone(supportedLanguages: readonly string[] = ['zh', 'en', 'th']): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map timezone regions to languages
    if (timezone.startsWith('Asia/Shanghai') ||
        timezone.startsWith('Asia/Hong_Kong') ||
        timezone.startsWith('Asia/Taipei') ||
        timezone.startsWith('Asia/Singapore')) {
      return 'zh';
    }

    if (timezone.startsWith('Asia/Bangkok')) {
      return 'th';
    }

    if (timezone.startsWith('America/') ||
        timezone.startsWith('Europe/') ||
        timezone.startsWith('Asia/Kolkata') ||  // India
        timezone.startsWith('Asia/Kuala_Lumpur') ||  // Malaysia
        timezone.startsWith('Asia/Manila')) {  // Philippines
      return 'en';
    }
  } catch (error) {
    console.warn('[geo-detection] Error getting timezone:', error);
  }

  return null;
}

/**
 * Fetch user's geolocation from IP address
 * Uses ipapi.co free API (no API key required)
 */
export async function getGeoLocationFromIP(): Promise<GeoLocationResult | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || 'IP API error');
    }

    return {
      country: data.country_name || '',
      countryCode: data.country_code || '',
      city: data.city,
      region: data.region,
    };
  } catch (error) {
    console.warn('[geo-detection] Failed to fetch geolocation:', error);
    return null;
  }
}

/**
 * Map country code to supported language
 */
export function mapCountryToLanguage(
  countryCode: string,
  supportedLanguages: readonly string[] = ['zh', 'en', 'th']
): string {
  const normalizedCountryCode = countryCode.toUpperCase();
  const language = COUNTRY_TO_LANG[normalizedCountryCode];

  // If mapped language is in our supported list, return it
  if (language && supportedLanguages.includes(language)) {
    return language;
  }

  // Default to English for unrecognized countries
  return DEFAULT_LANGUAGE;
}

/**
 * Detect language using multiple strategies (priority order):
 * 1. Browser language settings (fastest)
 * 2. Timezone (fast)
 * 3. IP geolocation (slower, requires API call)
 */
export async function detectLanguage(
  supportedLanguages: readonly string[] = ['zh', 'en', 'th']
): Promise<string> {
  // Strategy 1: Check browser language
  const browserLanguage = getLanguageFromBrowser(supportedLanguages);
  if (browserLanguage) {
    console.log('[geo-detection] Using browser language:', browserLanguage);
    return browserLanguage;
  }

  // Strategy 2: Check timezone
  const timezoneLanguage = getLanguageFromTimezone(supportedLanguages);
  if (timezoneLanguage) {
    console.log('[geo-detection] Using timezone language:', timezoneLanguage);
    return timezoneLanguage;
  }

  // Strategy 3: IP geolocation (last resort)
  try {
    const geoLocation = await getGeoLocationFromIP();
    if (geoLocation?.countryCode) {
      const ipLanguage = mapCountryToLanguage(geoLocation.countryCode, supportedLanguages);
      console.log('[geo-detection] Using IP-based language:', ipLanguage, 'from country:', geoLocation.country);
      return ipLanguage;
    }
  } catch (error) {
    console.warn('[geo-detection] IP detection failed:', error);
  }

  // Fallback to default
  console.log('[geo-detection] Using default language:', DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}

/**
 * Check if we should auto-detect language
 * Only detect if user hasn't set a preference before
 */
export function shouldAutoDetectLanguage(): boolean {
  if (typeof window === 'undefined') return false;

  const prefix = process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
  const savedLanguage = localStorage.getItem(`${prefix}lang`);

  return !savedLanguage;
}
