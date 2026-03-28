// Types
export type { SiteConfig, SupportedLocale, PaymentProvider, CategoryItem, CategoryDimension, ShopCategoriesConfig } from './site-config.types';
export * from './types';

// Translations
export { translations } from './translations';

// Components
export { default as JsonLd, organizationSchema, websiteSchema, courseSchema, productSchema, faqSchema, breadcrumbSchema, howToSchema, videoSchema, articleSchema, eventSchema } from './components/JsonLd';
export { default as OptimizedImage } from './components/OptimizedImage';
export { default as Skeleton } from './components/Skeleton';
export { default as CourseEquipmentSidebar } from './components/CourseEquipmentSidebar';
export { default as CourseEquipmentByModule } from './components/CourseEquipmentByModule';
export { default as InstructorToolsBlock } from './components/InstructorToolsBlock';

// Context
export { AuthProvider, useAuth } from './context/AuthContext';
export { CartProvider, useCart } from './context/CartContext';
export { LanguageProvider, useLanguage } from './context/LanguageContext';
export { NotificationProvider, useNotification } from './context/NotificationContext';

// Services
export { api } from './services/api';
export { supabase, getImageUrl } from './services/supabase';
export * from './services/translation';
export * from './services/email';

// Lib
export { PRODUCTS_CN, COURSES_CN, PORTAL_THEME } from './lib/constants';
export { LOCATIONS } from './lib/locations';
export { translateSpecKey, translateSpecs, specLabelTranslations } from './lib/spec-translations';
