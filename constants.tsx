
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
    id: 'csavs-ultra-basic-2026',
    title: 'CSAVS Veterinary Ultrasound - Basic (腹部超声系列·基础班)',
    specialty: Specialty.ULTRASOUND,
    level: 'Basic',
    price: 9800,
    currency: 'CNY',
    startDate: '2026-03-30',
    endDate: '2026-04-03',
    location: {
      city: 'Maanshan, China',
      venue: 'CSAVS Practical Training Center',
      address: 'Next to Maanshan East Railway Station (High Speed Rail)'
    },
    instructor: {
      name: 'Femke Bosma',
      title: 'DVM, DECVDI',
      credentials: ['European Specialist in Veterinary Diagnostic Imaging'],
      imageUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Dr. Femke Bosma graduated from Utrecht University in 2016. She joined the Animal Medical Center in Amsterdam and later completed her residency in radiology under Maartje Passon and Tessa Köning. She successfully passed the ECVDI certification exams in 2021.'
    },
    description: 'Systematic training on abdominal ultrasound physics, artifact recognition, and standard organ scanning protocols.',
    imageUrl: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'March 30',
        items: [
          { time: '09:00-12:00', activity: 'Basic Ultrasound Physics: How is the US image created? Types of Ultrasound Probes. Settings adjustment (Depth, Focus, Gain).' },
          { time: '13:00-17:00', activity: 'Artifacts: Recognition and mitigation. Probe handling techniques & standardization. Practical Session.' }
        ]
      },
      {
        day: 'Day 2',
        date: 'March 31',
        items: [
          { time: '09:00-12:00', activity: 'Liver & Biliary System: Normal hepatobiliary anatomy. Focal and diffuse hepatic lesions. Gallbladder mucocele.' },
          { time: '13:00-17:00', activity: 'Pancreas: Identifying the pancreas. Pancreatitis and neoplasia. Spleen: Normal anatomy and common pathologies. Practical.' }
        ]
      },
      {
        day: 'Day 3',
        date: 'April 1',
        items: [
          { time: '09:00-12:00', activity: 'Urogenital System: Kidneys, Ureters, Bladder. Chronic renal changes, neoplasia. Adrenal Glands identification.' },
          { time: '13:00-17:00', activity: 'Retroperitoneal Space: Anatomy and common pathology. Practical Session.' }
        ]
      },
      {
        day: 'Day 4',
        date: 'April 2',
        items: [
          { time: '09:00-12:00', activity: 'Gastrointestinal Tract: Normal anatomy of GIT segments. Motility. Ileus, Intussusception, Foreign bodies.' },
          { time: '13:00-17:00', activity: 'Abdominal Lymph Nodes: Identification and differentiation of reactive vs metastatic nodes. Practical.' }
        ]
      },
      {
        day: 'Day 5',
        date: 'April 3',
        items: [
          { time: '09:00-12:00', activity: 'Abdominal Vasculature: Aorta, Vena Cava, Portal Vein. Doppler usage. Peritoneum & Ascites.' },
          { time: '13:00-17:00', activity: 'Ultrasound-guided Interventions: Cystocentesis, FNAs, Biopsy techniques. Safety precautions. Practical.' }
        ]
      }
    ]
  },
  {
    id: 'csavs-soft-2026',
    title: 'CSAVS Practical Soft Tissue Surgery (软组织外科实操课程)',
    specialty: Specialty.SOFT_TISSUE,
    level: 'Advanced',
    price: 4800,
    currency: 'CNY',
    startDate: '2026-03-18',
    endDate: '2026-03-20',
    location: {
      city: 'Nanjing, China',
      venue: 'Nanjing Agricultural Univ. Teaching Hospital',
      address: '4th Floor Practical Center, New District'
    },
    instructor: {
      name: 'Joachim Proot',
      title: 'DVM, CertSAS, DECVS',
      credentials: ['European Specialist in Small Animal Surgery'],
      imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Joachim possesses 15 years of specialized surgical experience in referral tertiary care centers across the UK. He serves as the Chair of Soft Tissue Surgery at IVC Evidensia. His courses are highly regarded for their practicality.'
    },
    description: 'Intensive hands-on workshop covering Liver Lobectomy, Thoracic Surgery, and Reconstructive Skin Flaps.',
    imageUrl: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'March 18',
        items: [
          { time: '14:30-15:00', activity: 'Liver lobectomy using staplers' },
          { time: '15:00-15:30', activity: 'Diaphragmotomy to improve access to the liver' },
          { time: '15:30-16:00', activity: 'Duodenotomy and catheterisation of the common bile duct' },
          { time: '16:30-18:00', activity: 'Cholecystoduodenostomy & Cholecystectomy. Removal of sublumbar lymph nodes.' }
        ]
      },
      {
        day: 'Day 2',
        date: 'March 19',
        items: [
          { time: '08:30-10:00', activity: 'Intercostal thoracotomy & Sternotomy' },
          { time: '10:00-11:00', activity: 'Lung lobectomy' },
          { time: '11:00-12:00', activity: 'Pericardectomy' },
          { time: '13:00-15:00', activity: 'Total ear canal ablation (TECA)' },
          { time: '15:00-17:30', activity: 'Ventral bulla osteotomy' }
        ]
      },
      {
        day: 'Day 3',
        date: 'March 20',
        items: [
          { time: '08:30-10:00', activity: 'Axial pattern flaps' },
          { time: '10:00-10:30', activity: 'Subdermal plexus flaps' },
          { time: '10:30-12:00', activity: 'Free skin graft' },
          { time: '13:00-17:30', activity: 'Practical: Axial pattern flaps & Subdermal plexus flaps' }
        ]
      }
    ]
  },
  {
    id: 'csavs-eye-2026',
    title: 'European Veterinary Ophthalmology Certification VOSC-China (欧洲兽医眼科认证)',
    specialty: Specialty.EYE_SURGERY,
    level: 'Master',
    price: 15000,
    currency: 'CNY',
    startDate: '2026-01-03',
    endDate: '2026-01-05',
    location: {
      city: 'Shanghai, China',
      venue: 'I-VET Ophthalmology Training Center',
      address: '738 Shangcheng Road, Pudong New Area'
    },
    instructor: {
      name: 'Rick F. Sanchez',
      title: 'DVM, DECVO, CertVetEd',
      credentials: ['European Specialist in Veterinary Ophthalmology'],
      imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Rick is a pioneering veterinarian in applying suture burying techniques for corneal surgery. He re-established the Ophthalmology service at the RVC (Royal Veterinary College) in 2011 and is the editor of "An Atlas of Ophthalmic Surgery".'
    },
    description: 'Advanced Corneal Suturing, Reconstruction, and Phacoemulsification techniques.',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'Jan 3',
        items: [
          { time: '09:00-10:00', activity: 'Micro-ophthalmic instrument selection & magnification systems' },
          { time: '10:10-11:40', activity: 'Understanding corneal suture patterns & achieving excellence' },
          { time: '12:40-14:10', activity: 'Use of buried knots in corneal surgery' },
          { time: '14:20-17:00', activity: 'Practical Session: Advanced Corneal Suturing' }
        ]
      },
      {
        day: 'Day 2',
        date: 'Jan 4',
        items: [
          { time: '09:00-10:00', activity: 'Superficial keratectomy, laceration repair and iris prolapse' },
          { time: '10:00-11:00', activity: 'Conjunctival pedicle grafting and use of support pedicles' },
          { time: '11:10-12:10', activity: 'Corneoconjunctival Transpositions (CLCTS)' },
          { time: '13:10-14:10', activity: 'Use of Biomaterials' },
          { time: '14:20-17:00', activity: 'Practical Session: Advanced Corneal Reconstruction' }
        ]
      },
      {
        day: 'Day 3',
        date: 'Jan 5',
        items: [
          { time: '09:00-10:00', activity: 'The uncomplicated phacoemulsification' },
          { time: '10:00-11:30', activity: 'Problem solving I: Anterior capsulorrhexis and lens content removal' },
          { time: '12:30-14:00', activity: 'Problem solving II: Capsular tension ring (CTR) and IOL implant' },
          { time: '14:00-15:30', activity: 'Problem solving III: Aspiration of viscoelastic & corneal wound closure' },
          { time: '16:30-17:00', activity: 'Practical Session: Phacoemulsification techniques' }
        ]
      }
    ]
  },
  {
    id: 'csavs-joint-2026',
    title: 'CSAVS Practical Joint Surgery Workshop (关节外科实操课程)',
    specialty: Specialty.ORTHOPEDICS,
    level: 'Advanced',
    price: 4800,
    currency: 'CNY',
    startDate: '2026-03-18',
    endDate: '2026-03-20',
    location: {
      city: 'Maanshan, China',
      venue: 'CSAVS Training Center',
      address: 'Maanshan, Anhui Province'
    },
    instructor: {
      name: 'Antonio Pozzi',
      title: 'DVM, DECVS, DACVS, DACVSMR',
      credentials: ['Director of Small Animal Surgery at University of Zurich'],
      imageUrl: 'https://images.unsplash.com/photo-1531891437567-317ff7fd9008?auto=format&fit=crop&w=400&h=400&q=80',
      bio: 'Dr. Antonio Pozzi is a world-renowned specialist in neurosurgery, orthopedics, and sports medicine. His research team focuses on "One Health" and joint biomechanics. He has previously held faculty positions at the University of Florida.'
    },
    description: 'Mastering joint surgery: Bandaging, reduction of luxations, arthrotomy principles, and basic arthroscopy.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    status: 'Published',
    agenda: [
      {
        day: 'Day 1',
        date: 'March 18',
        items: [
          { time: '14:30-16:00', activity: 'Bandaging: how to perform bandages, splints, slings for joint diseases (Lecture)' },
          { time: '16:30-18:00', activity: 'Arthrotomy: Basic principles on how to perform an arthrotomy (Lecture)' }
        ]
      },
      {
        day: 'Day 2',
        date: 'March 19',
        items: [
          { time: '08:30-10:00', activity: 'How to perform an orthopedic examination: laxity tests, joint palpation (Practical)' },
          { time: '10:30-12:00', activity: 'Closed reduction of a luxation (Hip) and applying different bandages (Modified Robert Jones, Ehmer, Splints) (Practical)' },
          { time: '13:00-14:30', activity: 'Arthroscopy: Introduction to basic arthroscopy (Practical)' },
          { time: '15:00-17:30', activity: 'Basic Arthroscopy introduction continued (Practical)' }
        ]
      },
      {
        day: 'Day 3',
        date: 'March 20',
        items: [
          { time: '08:30-10:00', activity: 'Stifle arthrotomy: From surgical anatomy to joint exploration (Practical)' },
          { time: '10:30-12:00', activity: 'Stifle arthrotomy continued (Practical)' },
          { time: '13:00-14:30', activity: 'Arthroscopy: Arthroscopic assisted arthrotomy (Practical)' },
          { time: '15:00-17:30', activity: 'Arthroscopy: Other applications (Practical)' }
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
