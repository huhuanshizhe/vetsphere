import React from 'react';

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

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VetSphere",
    "url": "https://vetsphere.com",
    "logo": "https://vetsphere.com/logo.png",
    "description": "Global veterinary surgery education platform offering professional courses, precision medical equipment, and AI-powered surgical consultation.",
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "info@vetsphere.com",
      "availableLanguage": ["English", "Chinese", "Thai"]
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Shanghai",
      "addressCountry": "CN"
    }
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VetSphere",
    "url": "https://vetsphere.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://vetsphere.com/courses?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
}

export function courseSchema(course: {
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
      "name": "VetSphere",
      "url": "https://vetsphere.com"
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
        "url": "https://vetsphere.com/courses"
      }
    },
    "image": course.imageUrl
  };
}

export function productSchema(product: {
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
      "priceCurrency": "CNY",
      "availability": product.stockStatus === 'In Stock'
        ? "https://schema.org/InStock"
        : product.stockStatus === 'Low Stock'
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/OutOfStock",
      "url": "https://vetsphere.com/shop"
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
 * HowTo Schema for step-by-step guides - optimized for AI search engines (AEO)
 */
export function howToSchema(howTo: {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration format, e.g., "PT30M" for 30 minutes
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
  duration?: string; // ISO 8601 duration
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
export function articleSchema(article: {
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
      "name": article.publisher?.name || "VetSphere",
      "logo": {
        "@type": "ImageObject",
        "url": article.publisher?.logo || "https://vetsphere.com/logo.png"
      }
    }
  };
}

/**
 * Event Schema for courses and workshops
 */
export function eventSchema(event: {
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
      "name": event.organizer?.name || "VetSphere",
      "url": event.organizer?.url || "https://vetsphere.com"
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
