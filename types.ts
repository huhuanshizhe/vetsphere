
export enum Specialty {
  ORTHOPEDICS = 'Orthopedics',
  NEUROSURGERY = 'Neurosurgery',
  SOFT_TISSUE = 'Soft Tissue',
  EYE_SURGERY = 'Eye Surgery',
  EXOTICS = 'Exotics',
  ULTRASOUND = 'Ultrasound'
}

export type UserRole = 'Doctor' | 'CourseProvider' | 'ShopSupplier' | 'Admin';

export type ProductGroup = 'PowerTools' | 'Implants' | 'HandInstruments' | 'Consumables' | 'Equipment';

export interface DoctorProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  licenseNumber: string;
  clinicName: string;
  specialties: Specialty[];
  clinicalYears: number;
  referralCode: string;
  points: number;
  level: 'Resident' | 'Surgeon' | 'Expert' | 'Master';
  progress: {
    specialty: Specialty;
    level: number;
    completedCourses: string[];
  }[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  group: ProductGroup;
  price: number;
  specialty: Specialty;
  imageUrl: string;
  description: string;
  longDescription: string;
  specs: { [key: string]: string };
  compareData?: {
    torque?: string;
    weight?: string;
    battery?: string;
    material?: string;
  };
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  supplier: {
    name: string;
    origin: string;
    rating: number;
  };
}

export interface Course {
  id: string;
  title: string;
  specialty: Specialty;
  level: 'Basic' | 'Intermediate' | 'Advanced' | 'Master';
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  instructor: {
    name: string;
    imageUrl: string;
    title: string;
    credentials: string[];
    bio: string;
  };
  location: {
    city: string;
    venue: string;
    address: string;
  };
  description: string;
  status: string;
  agenda: {
    day: string;
    date: string;
    items: { time: string; activity: string; }[];
  }[];
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  type: 'course' | 'product';
  imageUrl: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Shipped' | 'Completed';
  date: string;
  shippingAddress: string;
}

export interface Quote {
  id: string;
  customerEmail: string;
  customerInfo: any;
  items: CartItem[];
  totalAmount: number;
  status: 'Active' | 'Expired';
  validUntil: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  specialty: Specialty;
  media: { type: 'image' | 'video'; url: string }[];
  stats: { likes: number; comments: number; saves: number };
  createdAt: string;
  isAiAnalyzed: boolean;
  author: {
    name: string;
    avatar: string;
    level: string;
    hospital: string;
  };
  // Structured Medical Data
  patientInfo?: {
    species: string;
    age: string;
    weight: string;
  };
  sections?: {
    diagnosis?: string;
    plan?: string;
    outcome?: string;
  };
  expertComment?: string;
}

export interface Lead {
  id: string;
  source: string;
  contactInfo: string;
  interestSummary: string;
  fullChatLog: Message[];
  status: 'New' | 'Contacted' | 'Converted' | 'Archived';
  createdAt: string;
  organization?: string;
}

export interface ShippingTemplate {
  id: string;
  name: string;
  regionCode: string;
  baseFee: number;
  // perItemFee corrected to camelCase
  perItemFee: number;
  currency: string;
  estimatedDays: string;
}

export interface AppNotification {
  id: string;
  type: 'order' | 'community' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  link?: string;
}
