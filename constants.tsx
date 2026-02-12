
import { Specialty, Course, Product, UserRole } from './types';

// --- VISUAL THEME SYSTEM ---
export const PORTAL_THEME: Record<UserRole, any> = {
  Doctor: {
    role: 'Doctor',
    colors: {
      primary: '#00A884',
      primaryBg: 'bg-[#00A884]',
      primaryText: 'text-[#00A884]',
      lightBg: 'bg-emerald-50',
      sidebarBg: 'bg-white', // Clean white for clinical feel
      sidebarText: 'text-slate-600',
      sidebarActive: 'bg-emerald-50 text-[#00A884] border-r-4 border-[#00A884]',
      pageBg: 'bg-slate-50'
    },
    meta: {
      title: 'Surgeon Portal',
      subtitle: 'Clinical Workspace',
      icon: '👨‍⚕️',
      image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1000&q=80',
      gradient: 'from-[#00A884] to-emerald-600'
    }
  },
  CourseProvider: {
    role: 'CourseProvider',
    colors: {
      primary: '#7C3AED',
      primaryBg: 'bg-purple-600',
      primaryText: 'text-purple-600',
      lightBg: 'bg-purple-50',
      sidebarBg: 'bg-[#2E1065]', // Deep purple for academic authority
      sidebarText: 'text-purple-200',
      sidebarActive: 'bg-white/10 text-white shadow-lg',
      pageBg: 'bg-[#F3F4F6]'
    },
    meta: {
      title: 'Education Partner',
      subtitle: 'Academic Management',
      icon: '🎓',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80',
      gradient: 'from-purple-600 to-indigo-900'
    }
  },
  ShopSupplier: {
    role: 'ShopSupplier',
    colors: {
      primary: '#2563EB',
      primaryBg: 'bg-blue-600',
      primaryText: 'text-blue-600',
      lightBg: 'bg-blue-50',
      sidebarBg: 'bg-[#0F172A]', // Dark slate for corporate/supply chain
      sidebarText: 'text-slate-400',
      sidebarActive: 'bg-blue-600 text-white',
      pageBg: 'bg-slate-100'
    },
    meta: {
      title: 'Supply Chain Console',
      subtitle: 'Global Inventory Control',
      icon: '📦',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80',
      gradient: 'from-blue-600 to-slate-900'
    }
  },
  Admin: {
    role: 'Admin',
    colors: {
      primary: '#10B981',
      primaryBg: 'bg-emerald-500',
      primaryText: 'text-emerald-500',
      lightBg: 'bg-slate-800',
      sidebarBg: 'bg-black', // Hacker style dark mode
      sidebarText: 'text-gray-500',
      sidebarActive: 'text-emerald-400 bg-white/5 border-l-2 border-emerald-500',
      pageBg: 'bg-[#0B1120]' // Very dark background
    },
    meta: {
      title: 'System Command',
      subtitle: 'Super Admin Access',
      icon: '🛡️',
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80',
      gradient: 'from-gray-900 to-black'
    }
  }
};


// English Data
export const COURSES: Course[] = [
  {
    id: 'csavs-ultra-001',
    title: 'Abdominal Ultrasound Series: Basic Principles',
    specialty: Specialty.ULTRASOUND,
    level: 'Basic',
    price: 9800,
    currency: 'CNY',
    startDate: '2026-03-30',
    endDate: '2026-04-03',
    location: {
      city: 'Maanshan, China',
      venue: 'CSAVS Training Center',
      address: 'Near East Maanshan Station (High Speed Rail)'
    },
    instructor: {
      name: 'Femke Bosma',
      title: 'DVM, DECVDI',
      credentials: ['European Specialist in Veterinary Diagnostic Imaging'],
      imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Dr. Femke Bosma graduated from Utrecht University in 2016. She is a recognized specialist in veterinary diagnostic imaging (ECVDI).'
    },
    description: 'Comprehensive introduction to abdominal ultrasound physics and organ-by-organ scanning techniques.',
    imageUrl: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'March 30',
        items: [
          { time: '08:30-09:00', activity: 'Registration' },
          { time: '09:00-12:00', activity: 'Physics & Theory' },
          { time: '13:00-17:00', activity: 'Practical Session' }
        ]
      }
    ]
  },
  {
    id: 'csavs-soft-001',
    title: 'Advanced Soft Tissue Surgery Workshop',
    specialty: Specialty.SOFT_TISSUE,
    level: 'Intermediate',
    price: 4800,
    currency: 'CNY',
    startDate: '2026-03-18',
    endDate: '2026-03-20',
    location: {
      city: 'Nanjing, China',
      venue: 'Teaching Hospital',
      address: '4th Floor, New Building'
    },
    instructor: {
      name: 'Joachim Proot',
      title: 'DVM, CertSAS, DECVS',
      credentials: ['European Specialist in Small Animal Surgery'],
      imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Joachim is a recognized leader in soft tissue and oncologic reconstruction.'
    },
    description: 'Intensive workshop focusing on liver lobectomy and complex skin flaps.',
    imageUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'March 18',
        items: [
          { time: '14:30-16:00', activity: 'Liver Lobectomy Theory' },
          { time: '16:30-18:00', activity: 'Practical Lab' }
        ]
      }
    ]
  }
];

// English Products
export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'TPLO High-Torque Saw System',
    brand: 'SurgiTech',
    supplier: { name: 'SurgiTech Germany GmbH', origin: 'Germany', rating: 4.9 },
    group: 'PowerTools',
    price: 15800,
    specialty: Specialty.ORTHOPEDICS,
    imageUrl: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80',
    description: 'German-engineered oscillating saw optimized for TPLO procedures with low vibration and high torque.',
    longDescription: 'This system features a fully sealed waterproof design, supporting autoclave sterilization. Its unique quick-coupling interface fits major global saw blade brands, making it ideal for high-volume surgical centers.',
    specs: { 'No-load Speed': '0-15000 rpm', 'Weight': '820g', 'Sterilization': '134°C Autoclave', 'Noise Level': '<65dB' },
    stockStatus: 'In Stock'
  },
  {
    id: 'p2',
    name: 'Titanium Locking Plate System 2.4/2.7/3.5mm',
    brand: 'VetOrtho',
    supplier: { name: 'VetOrtho Precision Mfg', origin: 'China', rating: 4.8 },
    group: 'Implants',
    price: 1250,
    specialty: Specialty.ORTHOPEDICS,
    imageUrl: 'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80',
    description: 'Medical Grade 5 Titanium locking plates designed for superior biological stability.',
    longDescription: 'The VetOrtho locking system is designed to minimize bone contact pressure, preserving periosteal blood supply. Anodized surface treatment enhances biocompatibility and reduces post-op infection risks.',
    specs: { 'Material': 'Ti-6Al-4V ELI', 'Surface': 'Anodized (Type II)', 'Thickness': '2.4mm - 3.8mm' },
    stockStatus: 'In Stock'
  },
  {
    id: 'p3',
    name: 'Micro-Ophthalmic Forceps (Straight/Curved)',
    brand: 'PrecisionEye',
    supplier: { name: 'Precision Eye Instruments', origin: 'USA', rating: 5.0 },
    group: 'HandInstruments',
    price: 1880,
    specialty: Specialty.EYE_SURGERY,
    imageUrl: 'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80',
    description: 'Swiss-crafted tips designed for delicate corneal and intraocular maneuvers.',
    longDescription: 'Hand-finished tips (0.1mm) ensure ultimate tactile feedback under the microscope. Lightweight handle design effectively reduces surgeon fatigue during long procedures.',
    specs: { 'Length': '115mm', 'Tip Size': '0.1mm', 'Material': 'Non-magnetic Stainless Steel' },
    stockStatus: 'Low Stock'
  },
  {
    id: 'p4',
    name: 'PGA Absorbable Sutures (Braided)',
    brand: 'SutureExpert',
    supplier: { name: 'Global Medical Supplies', origin: 'Germany', rating: 4.7 },
    group: 'Consumables',
    price: 580,
    specialty: Specialty.SOFT_TISSUE,
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    description: 'Box of 12. Excellent knot security and minimal tissue reaction.',
    longDescription: 'PGA sutures degrade via hydrolysis, providing a stable wound support period (approx. 21-28 days). Coated surface ensures smooth passage through tissue.',
    specs: { 'Sizes': '2-0 / 3-0 / 4-0', 'Length': '75cm', 'Needle': 'Reverse Cutting 3/8' },
    stockStatus: 'In Stock'
  }
];

// Alias exports to satisfy Dashboard.tsx imports and allow future expansion
export const COURSES_EN = COURSES;
export const COURSES_TH = COURSES;
export const COURSES_CN = COURSES;

export const PRODUCTS_EN = PRODUCTS;
export const PRODUCTS_TH = PRODUCTS;
export const PRODUCTS_CN = PRODUCTS;
