import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  googleSiteVerification?: string;
}

export const useSEO = ({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  googleSiteVerification,
}: SEOProps) => {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = 'Stay Away';
    const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} - Hệ Thống Quản Lý Khách Sạn & Đặt Phòng Cao Cấp`;
    document.title = fullTitle;

    // 2. Helper to set or create meta tags
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    if (googleSiteVerification) {
      setMeta('google-site-verification', googleSiteVerification);
    }

    if (description) {
      setMeta('description', description);
      setMeta('og:description', ogDescription || description, true);
      setMeta('twitter:description', ogDescription || description);
    }

    if (keywords) {
      setMeta('keywords', keywords);
    }

    setMeta('og:title', ogTitle || fullTitle, true);
    setMeta('twitter:title', ogTitle || fullTitle);
    setMeta('og:type', ogType, true);

    if (ogImage) {
      setMeta('og:image', ogImage, true);
      setMeta('twitter:image', ogImage);
    }

    // 3. Update Canonical link
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, ogType]);
};

export default useSEO;
