
import { Specialty, Course, Product, UserRole, Certification, CourseProductRelation } from '../types';

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
    maxCapacity: 12,
    enrolledCount: 0,
    enrollmentDeadline: '2026-03-15',
    targetAudience: 'Small Animal Veterinarians',
    targetAudience_zh: '小动物临床兽医',
    totalHours: 40,
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
    maxCapacity: 16,
    enrolledCount: 0,
    enrollmentDeadline: '2026-03-01',
    targetAudience: 'Small Animal Surgeons',
    targetAudience_zh: '小动物外科兽医',
    totalHours: 24,
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
    maxCapacity: 10,
    enrolledCount: 0,
    enrollmentDeadline: '2025-12-15',
    targetAudience: 'Veterinary Ophthalmologists',
    targetAudience_zh: '兽医眼科医生',
    totalHours: 32,
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
    maxCapacity: 20,
    enrolledCount: 0,
    enrollmentDeadline: '2026-03-01',
    targetAudience: 'Small Animal Veterinarians',
    targetAudience_zh: '小动物临床兽医',
    totalHours: 40,
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
    stockStatus: 'In Stock',
    purchaseMode: 'hybrid',
    clinicalCategory: 'surgery-anesthesia',
    certifications: [{ type: 'ISO 13485', number: 'DE-2024-0891', issuer: 'TÜV SÜD', validUntil: '2027-12' }, { type: 'CE', number: 'CE-0123-SAW', issuer: 'BSI', validUntil: '2027-06' }],
    categorySlug: 'surgery-anesthesia',
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
    stockStatus: 'In Stock',
    purchaseMode: 'direct',
    clinicalCategory: 'surgery-anesthesia',
    certifications: [{ type: 'ISO 13485', number: 'CN-2024-TLP-02', issuer: 'SGS', validUntil: '2027-09' }],
    categorySlug: 'surgery-anesthesia',
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
    stockStatus: 'Low Stock',
    purchaseMode: 'direct',
    clinicalCategory: 'surgery-anesthesia',
    certifications: [{ type: 'FDA 510(k)', number: 'K241234', issuer: 'FDA', validUntil: '2028-03' }],
    categorySlug: 'surgery-anesthesia',
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
    stockStatus: 'In Stock',
    purchaseMode: 'direct',
    clinicalCategory: 'daily-supplies',
    categorySlug: 'daily-supplies',
  },
  {
    id: 'p5',
    name: 'VetSono Pro Portable Ultrasound',
    brand: 'VetSono',
    supplier: { name: 'VetSono Medical Technology', origin: 'Japan', rating: 4.9 },
    group: 'PowerTools',
    price: 28500,
    specialty: Specialty.ULTRASOUND,
    imageUrl: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80',
    description: 'Compact portable ultrasound with 12MHz linear and 5MHz convex probes. Ideal for small animal abdominal and cardiac imaging.',
    longDescription: 'VetSono Pro delivers hospital-grade imaging in a portable form factor. Features include Color Doppler, PW/CW Doppler, M-mode, and automated measurements. Battery life of 3 hours enables field use.',
    specs: { 'Probes': '12MHz Linear + 5MHz Convex', 'Display': '15.6" HD LED', 'Weight': '5.2kg', 'Battery': '3h continuous' },
    stockStatus: 'In Stock',
    purchaseMode: 'inquiry',
    clinicalCategory: 'imaging-diagnostics',
    certifications: [{ type: 'ISO 13485', number: 'JP-2024-USP-05', issuer: 'JQA', validUntil: '2028-01' }, { type: 'CE', number: 'CE-0197-USP', issuer: 'TÜV Rheinland' }],
    categorySlug: 'imaging-diagnostics',
  },
  {
    id: 'p6',
    name: 'Multi-Frequency Ultrasound Probe Set (3/7/12MHz)',
    brand: 'VetSono',
    supplier: { name: 'VetSono Medical Technology', origin: 'Japan', rating: 4.9 },
    group: 'PowerTools',
    price: 8900,
    specialty: Specialty.ULTRASOUND,
    imageUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
    description: 'Professional probe set covering abdominal, cardiac, and musculoskeletal imaging. Compatible with VetSono Pro and most major brands.',
    longDescription: 'Three probes optimized for veterinary use: 3MHz sector for deep abdominal/cardiac, 7MHz micro-convex for small parts, 12MHz linear for superficial structures and MSK. Crystal element technology provides exceptional resolution.',
    specs: { 'Frequencies': '3 / 7 / 12 MHz', 'Cable Length': '2.1m', 'Connector': 'Universal USB-C' },
    stockStatus: 'In Stock',
    purchaseMode: 'direct',
    clinicalCategory: 'imaging-diagnostics',
    categorySlug: 'imaging-diagnostics',
  },
  {
    id: 'p7',
    name: 'Phacoemulsification System VetPhaco-3000',
    brand: 'PrecisionEye',
    supplier: { name: 'Precision Eye Instruments', origin: 'USA', rating: 5.0 },
    group: 'PowerTools',
    price: 45000,
    specialty: Specialty.EYE_SURGERY,
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    description: 'Complete phacoemulsification unit with integrated vitrectomy function. Designed specifically for veterinary cataract surgery.',
    longDescription: 'The VetPhaco-3000 features intelligent fluidics that adapt to anterior chamber depth, reducing surge risk. Dual-linear foot pedal provides precise control. Includes IOL insertion toolkit.',
    specs: { 'Phaco Frequency': '40kHz', 'Vacuum': '0-650mmHg', 'Aspiration': '0-65cc/min', 'Display': '10.1" Touchscreen' },
    stockStatus: 'In Stock',
    purchaseMode: 'inquiry',
    clinicalCategory: 'surgery-anesthesia',
    certifications: [{ type: 'FDA 510(k)', number: 'K240567', issuer: 'FDA', validUntil: '2028-06' }, { type: 'ISO 13485', number: 'US-2024-PHC-07', issuer: 'NSF International' }],
    categorySlug: 'surgery-anesthesia',
  },
  {
    id: 'p8',
    name: 'Arthroscopy Tower System VetScope-HD',
    brand: 'SurgiTech',
    supplier: { name: 'SurgiTech Germany GmbH', origin: 'Germany', rating: 4.9 },
    group: 'PowerTools',
    price: 38000,
    specialty: Specialty.ORTHOPEDICS,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    description: 'Full HD arthroscopy system with 2.7mm and 4.0mm scopes, LED light source, and fluid management pump.',
    longDescription: 'VetScope-HD provides crystal-clear intra-articular visualization. The integrated recording system captures surgery footage for case review and training. Compact tower design saves OR floor space.',
    specs: { 'Resolution': '1920x1080 Full HD', 'Scope Diameter': '2.7mm / 4.0mm', 'Light Source': 'LED 50W', 'Recording': '4K/1080p USB' },
    stockStatus: 'In Stock',
    purchaseMode: 'hybrid',
    clinicalCategory: 'surgery-anesthesia',
    certifications: [{ type: 'ISO 13485', number: 'DE-2024-ART-08', issuer: 'TÜV SÜD', validUntil: '2027-11' }, { type: 'CE', number: 'CE-0123-ART', issuer: 'BSI' }],
    categorySlug: 'surgery-anesthesia',
  },
];

// Alias exports to satisfy Dashboard.tsx imports and allow future expansion
export const COURSES_EN = COURSES;
export const COURSES_TH = COURSES;
export const COURSES_CN = COURSES;

export const PRODUCTS_EN = PRODUCTS;
export const PRODUCTS_TH = PRODUCTS;
export const PRODUCTS_CN = PRODUCTS;

// ---- SEED: Course-Product Relations ----
// Maps courses to products with relationship types, day indexes, and instructor notes.
// Used as mock fallback when course_product_relations DB table is empty.

const productMap = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

function rel(
  id: string,
  courseId: string,
  productId: string,
  relationshipType: 'required' | 'recommended' | 'mentioned',
  relationType: 'course' | 'module' | 'instructor',
  dayIndex: number | null,
  displayOrder: number,
  noteEn?: string,
  noteTh?: string,
  noteJa?: string,
): CourseProductRelation {
  return {
    id,
    courseId,
    productId,
    relationshipType,
    relationType,
    dayIndex,
    displayOrder,
    instructorNoteEn: noteEn,
    instructorNoteTh: noteTh,
    instructorNoteJa: noteJa,
    product: productMap[productId],
  };
}

export const SEED_COURSE_PRODUCT_RELATIONS: Record<string, CourseProductRelation[]> = {
  // ── Ultrasound Basic (5-day) ─────────────────────────────
  'csavs-ultra-basic-2026': [
    rel('cpr-u1', 'csavs-ultra-basic-2026', 'p5', 'required', 'course', null, 1,
      'Primary ultrasound unit used throughout the course',
      'เครื่องอัลตราซาวด์หลักที่ใช้ตลอดหลักสูตร',
      'コース全体で使用するメイン超音波ユニット'),
    rel('cpr-u2', 'csavs-ultra-basic-2026', 'p6', 'required', 'module', 1, 2,
      'Multi-frequency probes for physics & artifact exercises',
      'โพรบหลายความถี่สำหรับฝึกฟิสิกส์และอาร์ติแฟกต์',
      '物理学とアーチファクト演習用マルチ周波数プローブ'),
    rel('cpr-u3', 'csavs-ultra-basic-2026', 'p6', 'required', 'module', 3, 3,
      'High-frequency probe for kidney & adrenal imaging',
      'โพรบความถี่สูงสำหรับภาพไตและต่อมหมวกไต',
      '腎臓・副腎イメージング用高周波プローブ'),
    rel('cpr-u4', 'csavs-ultra-basic-2026', 'p6', 'required', 'module', 5, 4,
      'Doppler-capable probes for vascular assessment',
      'โพรบที่รองรับ Doppler สำหรับประเมินหลอดเลือด',
      '血管評価用ドップラー対応プローブ'),
    rel('cpr-u5', 'csavs-ultra-basic-2026', 'p4', 'recommended', 'module', 5, 5,
      'Sutures for ultrasound-guided FNA practice',
      'ไหมเย็บสำหรับฝึก FNA ด้วยอัลตราซาวด์',
      '超音波ガイド下FNA練習用縫合糸'),
    rel('cpr-u6', 'csavs-ultra-basic-2026', 'p1', 'mentioned', 'instructor', null, 6,
      'Dr. Bosma recommends for clinics expanding to surgical services',
      'Dr. Bosma แนะนำสำหรับคลินิกที่ขยายบริการศัลยกรรม',
      'Bosma先生が手術サービス拡大クリニックに推奨'),
  ],

  // ── Soft Tissue Surgery (3-day) ──────────────────────────
  'csavs-soft-2026': [
    rel('cpr-s1', 'csavs-soft-2026', 'p4', 'required', 'course', null, 1,
      'Essential sutures for all soft tissue procedures',
      'ไหมเย็บที่จำเป็นสำหรับหัตถการเนื้อเยื่ออ่อนทั้งหมด',
      '全軟部組織手技に必須の縫合糸'),
    rel('cpr-s2', 'csavs-soft-2026', 'p1', 'required', 'module', 1, 2,
      'Liver lobectomy using powered stapler system',
      'การตัดกลีบตับด้วยระบบ stapler แบบมีกำลัง',
      'パワーステープラーシステムによる肝葉切除'),
    rel('cpr-s3', 'csavs-soft-2026', 'p3', 'recommended', 'module', 2, 3,
      'Fine forceps for pericardectomy and TECA procedures',
      'คีมละเอียดสำหรับการตัดเยื่อหุ้มหัวใจและ TECA',
      '心膜切除術とTECA手技用精密鉗子'),
    rel('cpr-s4', 'csavs-soft-2026', 'p2', 'recommended', 'module', 3, 4,
      'Mini plates for reconstructive flap stabilization',
      'แผ่นเพลทขนาดเล็กเพื่อยึดแผ่นเนื้อเยื่อในการสร้างใหม่',
      '再建皮弁の固定用ミニプレート'),
    rel('cpr-s5', 'csavs-soft-2026', 'p5', 'mentioned', 'instructor', null, 5,
      'Dr. Proot recommends intraoperative ultrasound for hepatic surgery',
      'Dr. Proot แนะนำอัลตราซาวด์ระหว่างผ่าตัดสำหรับศัลยกรรมตับ',
      'Proot先生が肝臓手術における術中超音波を推奨'),
  ],

  // ── Ophthalmology (3-day) ────────────────────────────────
  'csavs-eye-2026': [
    rel('cpr-e1', 'csavs-eye-2026', 'p3', 'required', 'course', null, 1,
      'Primary micro-forceps used in all ophthalmic practicals',
      'คีมจุลภาคหลักที่ใช้ในการฝึกปฏิบัติทางจักษุทั้งหมด',
      '全眼科実習で使用する主要マイクロ鉗子'),
    rel('cpr-e2', 'csavs-eye-2026', 'p7', 'required', 'module', 3, 2,
      'Phaco system for Day 3 cataract surgery practicals',
      'ระบบ Phaco สำหรับฝึกผ่าตัดต้อกระจกวันที่ 3',
      '3日目白内障手術実習用Phacoシステム'),
    rel('cpr-e3', 'csavs-eye-2026', 'p4', 'required', 'module', 1, 3,
      '8-0 / 9-0 sutures for corneal suturing exercises',
      'ไหมเย็บ 8-0 / 9-0 สำหรับฝึกเย็บกระจกตา',
      '角膜縫合練習用8-0/9-0縫合糸'),
    rel('cpr-e4', 'csavs-eye-2026', 'p4', 'required', 'module', 2, 4,
      'Sutures for corneal reconstruction and graft techniques',
      'ไหมเย็บสำหรับเทคนิคการสร้างกระจกตาใหม่และการปลูกถ่าย',
      '角膜再建・移植技術用縫合糸'),
    rel('cpr-e5', 'csavs-eye-2026', 'p5', 'mentioned', 'instructor', null, 5,
      'Dr. Sanchez recommends ocular ultrasound for pre-surgical lens assessment',
      'Dr. Sanchez แนะนำอัลตราซาวด์ตาสำหรับประเมินเลนส์ก่อนผ่าตัด',
      'Sanchez先生が術前水晶体評価に眼科超音波を推奨'),
  ],

  // ── Joint Surgery (3-day) ────────────────────────────────
  'csavs-joint-2026': [
    rel('cpr-j1', 'csavs-joint-2026', 'p8', 'required', 'course', null, 1,
      'Full arthroscopy tower for practical sessions',
      'ระบบอาร์โทรสโคปีครบชุดสำหรับฝึกปฏิบัติ',
      '実習セッション用フル関節鏡タワー'),
    rel('cpr-j2', 'csavs-joint-2026', 'p1', 'required', 'module', 2, 2,
      'Power tools for arthrotomy approach demonstration',
      'เครื่องมือไฟฟ้าสำหรับสาธิตวิธีเข้า arthrotomy',
      '関節切開アプローチデモンストレーション用パワーツール'),
    rel('cpr-j3', 'csavs-joint-2026', 'p2', 'required', 'module', 3, 3,
      'Locking plates for stifle arthrotomy stabilization',
      'แผ่นเพลทล็อคสำหรับยึดการตัดข้อเข่า',
      '膝関節切開安定化用ロッキングプレート'),
    rel('cpr-j4', 'csavs-joint-2026', 'p8', 'required', 'module', 2, 4,
      'Arthroscope 2.7mm for basic joint exploration',
      'กล้องอาร์โทรสโคป 2.7 มม. สำหรับสำรวจข้อต่อเบื้องต้น',
      '基本関節探索用2.7mm関節鏡'),
    rel('cpr-j5', 'csavs-joint-2026', 'p8', 'required', 'module', 3, 5,
      'Arthroscope 4.0mm for advanced stifle procedures',
      'กล้องอาร์โทรสโคป 4.0 มม. สำหรับหัตถการข้อเข่าขั้นสูง',
      '高度膝関節手技用4.0mm関節鏡'),
    rel('cpr-j6', 'csavs-joint-2026', 'p4', 'recommended', 'module', 3, 6,
      'Sutures for post-arthrotomy wound closure',
      'ไหมเย็บสำหรับปิดแผลหลัง arthrotomy',
      '関節切開後創閉鎖用縫合糸'),
    rel('cpr-j7', 'csavs-joint-2026', 'p5', 'mentioned', 'instructor', null, 7,
      'Dr. Pozzi recommends ultrasound for joint effusion assessment',
      'Dr. Pozzi แนะนำอัลตราซาวด์สำหรับประเมินน้ำในข้อ',
      'Pozzi先生が関節液貯留評価に超音波を推奨'),
  ],
};
