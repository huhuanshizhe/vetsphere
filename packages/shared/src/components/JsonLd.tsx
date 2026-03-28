import React from 'react';
import type { SiteConfig } from '../site-config.types';

interface JsonLdProps {
  data: Record<string, any>;
}

/**
 * Server-compatible JSON-LD structured data component for SEO/AEO.
 * Renders a <script type="application/ld+json"> tag with the provided data.
 */
const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
};

export default JsonLd;

// --- Pre-built Schema Generators ---

export function organizationSchema(siteConfig: SiteConfig) {
  const languageMap: Record<string, string> = { zh: 'Chinese', en: 'English', th: 'Thai' };
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteConfig.organizationName,
    "url": siteConfig.siteUrl,
    "logo": `${siteConfig.siteUrl}/logo.png`,
    "description": "Global veterinary surgery education platform offering professional courses, precision medical equipment, and AI-powered surgical consultation.",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": siteConfig.contactEmail,
      "availableLanguage": siteConfig.locales.map(l => languageMap[l] || l)
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": siteConfig.organizationAddress.locality,
      "addressCountry": siteConfig.organizationAddress.country
    }
  };
}

export function websiteSchema(siteConfig: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteConfig.siteName,
    "url": siteConfig.siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteConfig.siteUrl}/courses?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function courseSchema(siteConfig: SiteConfig, course: {
  title: string;
  description: string;
  instructor: { name: string; title: string };
  startDate: string;
  endDate: string;
  location: { city: string; venue: string; address: string };
  price: number;
  currency: string;
  imageUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": siteConfig.organizationName,
      "url": siteConfig.siteUrl
    },
    "instructor": {
      "@type": "Person",
      "name": course.instructor.name,
      "jobTitle": course.instructor.title
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "onsite",
      "startDate": course.startDate,
      "endDate": course.endDate,
      "location": {
        "@type": "Place",
        "name": course.location.venue,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": course.location.address,
          "addressLocality": course.location.city
        }
      },
      "offers": {
        "@type": "Offer",
        "price": course.price,
        "priceCurrency": course.currency,
        "availability": "https://schema.org/InStock",
        "url": `${siteConfig.siteUrl}/courses`
      }
    },
    "image": course.imageUrl
  };
}

export function productSchema(siteConfig: SiteConfig, product: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  brand: string;
  stockStatus: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": product.brand
    },
    "image": product.imageUrl,
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": siteConfig.defaultCurrency,
      "availability": product.stockStatus === 'In Stock'
        ? "https://schema.org/InStock"
        : product.stockStatus === 'Low Stock'
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/OutOfStock",
      "url": `${siteConfig.siteUrl}/shop`
    }
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

/**
 * CategoryPage Schema - CollectionPage for category listing pages
 * Optimized for e-commerce category pages
 */
export function categoryPageSchema(params: {
  siteConfig: SiteConfig;
  categoryName: string;
  categorySlug: string;
  locale: string;
  description?: string;
  imageUrl?: string;
  numberOfItems?: number;
}) {
  const { siteConfig, categoryName, categorySlug, locale, description, imageUrl, numberOfItems } = params;
  const categoryUrl = `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": categoryName,
    "description": description || `${categoryName} - Professional veterinary equipment and instruments`,
    "url": categoryUrl,
    ...(imageUrl && { "image": imageUrl }),
    "publisher": {
      "@type": "Organization",
      "name": siteConfig.organizationName,
      "url": siteConfig.siteUrl,
      "logo": `${siteConfig.siteUrl}/logo.png`
    },
    "inLanguage": locale,
    ...(numberOfItems !== undefined && { "numberOfItems": numberOfItems }),
    "isPartOf": {
      "@type": "WebSite",
      "name": siteConfig.siteName,
      "url": siteConfig.siteUrl
    }
  };
}

/**
 * ItemList Schema - Products in category
 * Helps search engines understand the product listing structure
 */
export function itemListSchema(params: {
  siteConfig: SiteConfig;
  products: Array<{
    name: string;
    slug: string;
    price?: number;
    brand?: string;
    imageUrl?: string;
  }>;
  categorySlug: string;
  locale: string;
}) {
  const { siteConfig, products, categorySlug, locale } = params;
  const categoryUrl = `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Products in ${categorySlug}`,
    "description": `List of veterinary equipment products`,
    "url": categoryUrl,
    "numberOfItems": products.length,
    "itemListOrder": "http://schema.org/ItemListOrderDescending",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${siteConfig.siteUrl}/${locale}/shop/${product.slug}`,
      "name": product.name,
      ...(product.price && {
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": siteConfig.defaultCurrency,
          "availability": "https://schema.org/InStock"
        }
      }),
      ...(product.brand && {
        "additionalProperty": {
          "@type": "PropertyValue",
          "name": "brand",
          "value": product.brand
        }
      })
    }))
  };
}

/**
 * ProductList Schema - Alternative format for product listings
 * Combined with CollectionPage for better SEO
 */
export function productListSchema(params: {
  siteConfig: SiteConfig;
  products: Array<{
    name: string;
    slug: string;
    description?: string;
    price?: number;
    brand?: string;
    imageUrl?: string;
    availability?: 'InStock' | 'OutOfStock' | 'LimitedAvailability';
  }>;
  categoryName: string;
  categorySlug: string;
  locale: string;
}) {
  const { siteConfig, products, categoryName, categorySlug, locale } = params;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${categoryName} Products`,
    "url": `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`,
    "description": `Browse ${categoryName.toLowerCase()} veterinary equipment and instruments`,
    "isPartOf": {
      "@type": "CollectionPage",
      "name": categoryName,
      "url": `${siteConfig.siteUrl}/${locale}/shop/${categorySlug}`
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": products.length,
      "itemListElement": products.map((product, index) => ({
        "@type": "Product",
        "position": index + 1,
        "name": product.name,
        "description": product.description,
        "url": `${siteConfig.siteUrl}/${locale}/shop/${product.slug}`,
        ...(product.imageUrl && { "image": product.imageUrl }),
        ...(product.brand && {
          "brand": {
            "@type": "Brand",
            "name": product.brand
          }
        }),
        ...(product.price && {
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": siteConfig.defaultCurrency,
            "availability": product.availability
              ? `https://schema.org/${product.availability}`
              : "https://schema.org/InStock"
          }
        })
      }))
    }
  };
}

/**
 * HowTo Schema for step-by-step guides - optimized for AI search engines (AEO)
 */
export function howToSchema(howTo: {
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: { currency: string; value: number };
  supply?: string[];
  tool?: string[];
  steps: { name: string; text: string; image?: string; url?: string }[];
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": howTo.name,
    "description": howTo.description,
    ...(howTo.totalTime && { "totalTime": howTo.totalTime }),
    ...(howTo.estimatedCost && {
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": howTo.estimatedCost.currency,
        "value": howTo.estimatedCost.value
      }
    }),
    ...(howTo.supply && {
      "supply": howTo.supply.map(item => ({
        "@type": "HowToSupply",
        "name": item
      }))
    }),
    ...(howTo.tool && {
      "tool": howTo.tool.map(item => ({
        "@type": "HowToTool",
        "name": item
      }))
    }),
    "step": howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.image && { "image": step.image }),
      ...(step.url && { "url": step.url })
    })),
    ...(howTo.image && { "image": howTo.image })
  };
}

/**
 * VideoObject Schema for video content - helps with video SEO and AEO
 */
export function videoSchema(video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.name,
    "description": video.description,
    "thumbnailUrl": video.thumbnailUrl,
    "uploadDate": video.uploadDate,
    ...(video.duration && { "duration": video.duration }),
    ...(video.contentUrl && { "contentUrl": video.contentUrl }),
    ...(video.embedUrl && { "embedUrl": video.embedUrl })
  };
}

/**
 * Article Schema for blog posts and educational content - optimized for AEO
 */
export function articleSchema(siteConfig: SiteConfig, article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: { name: string; url?: string };
  publisher?: { name: string; logo?: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.headline,
    "description": article.description,
    "image": article.image,
    "datePublished": article.datePublished,
    ...(article.dateModified && { "dateModified": article.dateModified }),
    "author": {
      "@type": "Person",
      "name": article.author.name,
      ...(article.author.url && { "url": article.author.url })
    },
    "publisher": {
      "@type": "Organization",
      "name": article.publisher?.name || siteConfig.organizationName,
      "logo": {
        "@type": "ImageObject",
        "url": article.publisher?.logo || `${siteConfig.siteUrl}/logo.png`
      }
    }
  };
}

/**
 * Event Schema for courses and workshops
 */
export function eventSchema(siteConfig: SiteConfig, event: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: { name: string; address: string };
  image?: string;
  offers?: { price: number; currency: string; availability: string };
  organizer?: { name: string; url?: string };
  performer?: { name: string; jobTitle?: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "name": event.name,
    "description": event.description,
    "startDate": event.startDate,
    "endDate": event.endDate,
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": event.location.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.location.address
      }
    },
    ...(event.image && { "image": event.image }),
    ...(event.offers && {
      "offers": {
        "@type": "Offer",
        "price": event.offers.price,
        "priceCurrency": event.offers.currency,
        "availability": `https://schema.org/${event.offers.availability}`,
        "validFrom": new Date().toISOString()
      }
    }),
    "organizer": {
      "@type": "Organization",
      "name": event.organizer?.name || siteConfig.organizationName,
      "url": event.organizer?.url || siteConfig.siteUrl
    },
    ...(event.performer && {
      "performer": {
        "@type": "Person",
        "name": event.performer.name,
        ...(event.performer.jobTitle && { "jobTitle": event.performer.jobTitle })
      }
    })
  };
}
