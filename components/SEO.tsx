
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  type?: 'website' | 'article' | 'product';
}

/**
 * VetSphere SEO 动态管理器
 * 监听路由变化，自动更新文档标题、元描述并上报 GA4
 */
const SEO: React.FC<SEOProps> = ({ title, description, keywords, type = 'website' }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. 动态更新 Title
    const baseTitle = "VetSphere | 全球宠物医生专业教育与器械平台";
    const finalTitle = title ? `${title} | VetSphere` : baseTitle;
    document.title = finalTitle;

    // 2. 动态更新 Meta Tags
    const updateMeta = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const updateProperty = (property: string, content: string) => {
        let element = document.querySelector(`meta[property="${property}"]`);
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute('property', property);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };

    if (description) {
      updateMeta('description', description);
      updateProperty('og:description', description);
    }
    
    if (keywords) {
      updateMeta('keywords', keywords);
    }

    updateProperty('og:title', finalTitle);
    updateProperty('og:url', `https://vetsphere.pro${pathname}`);
    updateProperty('og:type', type);

    // 3. Google Analytics 4 (GA4) 路由追踪
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', {
        page_title: finalTitle,
        page_location: window.location.href,
        page_path: pathname
      });
    }

  }, [pathname, title, description, keywords, type]);

  return null;
};

export default SEO;
