/**
 * Social Sharing Platform Configuration
 * Market-specific social platforms for CN and INTL versions
 */

export interface SocialPlatform {
  id: string;
  label: string;
  labelZh?: string;
  icon: string;
  shareUrl?: (url: string, title: string) => string;
  color?: string;
}

// China Market Platforms
export const CN_SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'wechat',
    label: 'WeChat',
    labelZh: '微信',
    icon: '💬',
    color: '#07C160',
    // WeChat requires QR code scanning, no direct URL
  },
  {
    id: 'weibo',
    label: 'Weibo',
    labelZh: '微博',
    icon: '📱',
    color: '#E6162D',
    shareUrl: (url, title) => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: 'qq',
    label: 'QQ',
    labelZh: 'QQ',
    icon: '🐧',
    color: '#12B7F5',
    shareUrl: (url, title) => `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: 'xiaohongshu',
    label: 'Xiaohongshu',
    labelZh: '小红书',
    icon: '📕',
    color: '#FF2442',
    // Xiaohongshu requires in-app sharing
  },
  {
    id: 'copy',
    label: 'Copy Link',
    labelZh: '复制链接',
    icon: '📋',
    color: '#64748B',
  },
];

// International Market Platforms
export const INTL_SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '🔗',
    color: '#0A66C2',
    shareUrl: (url, title) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X',
    icon: '𝕏',
    color: '#000000',
    shareUrl: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    shareUrl: (url, title) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '📲',
    color: '#25D366',
    shareUrl: (url, title) => `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
  },
  {
    id: 'line',
    label: 'Line',
    icon: '💚',
    color: '#00B900',
    shareUrl: (url, title) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'copy',
    label: 'Copy Link',
    icon: '📋',
    color: '#64748B',
  },
];

/**
 * Get social platforms based on market
 * @param market - 'cn', 'intl', 'admin', 'edu-partner', or 'gear-partner'
 * @param locale - current language for labels
 */
export function getSocialPlatforms(market: 'cn' | 'intl' | 'admin' | 'edu-partner' | 'gear-partner', locale?: string): SocialPlatform[] {
  // Non-consumer apps don't use social sharing, default to CN platforms for type safety
  const platforms = market === 'intl' ? INTL_SOCIAL_PLATFORMS : CN_SOCIAL_PLATFORMS;
  
  // Use Chinese labels for CN market when locale is zh
  if (market === 'cn' && locale === 'zh') {
    return platforms.map(p => ({
      ...p,
      label: p.labelZh || p.label,
    }));
  }
  
  return platforms;
}

/**
 * Execute share action
 * @param platform - social platform configuration
 * @param url - URL to share
 * @param title - title/description to share
 */
export async function shareToPlatform(
  platform: SocialPlatform,
  url: string,
  title: string
): Promise<boolean> {
  // Copy to clipboard
  if (platform.id === 'copy') {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }

  // WeChat/Xiaohongshu - show QR code modal (handled by component)
  if (platform.id === 'wechat' || platform.id === 'xiaohongshu') {
    return false; // Signal to show QR modal
  }

  // Open share URL in new window
  if (platform.shareUrl) {
    const shareUrl = platform.shareUrl(url, title);
    window.open(shareUrl, '_blank', 'width=600,height=400');
    return true;
  }

  return false;
}

export default {
  CN_SOCIAL_PLATFORMS,
  INTL_SOCIAL_PLATFORMS,
  getSocialPlatforms,
  shareToPlatform,
};
