
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

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

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
  status?: 'Active' | 'Banned';
}

// --- 社区相关类型 ---
export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    level: string;
    hospital: string;
  };
  title: string;
  content: string;
  specialty: Specialty;
  media: {
    type: 'image' | 'video';
    url: string;
  }[];
  usedProducts?: string[]; // 关联商城器械 ID
  stats: {
    likes: number;
    comments: number;
    saves: number;
  };
  createdAt: string;
  isAiAnalyzed?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  replies?: Comment[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  procedure?: string;
  supplier: {
    name: string;
    origin: string;
    rating: number;
  };
  group: ProductGroup;
  price: number;
  specialty: Specialty;
  imageUrl: string;
  description: string;
  longDescription?: string;
  specs: { [key: string]: string };
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  approvalStatus?: ApprovalStatus;
}

export interface Course {
  id: string;
  title: string;
  instructor: Instructor;
  specialty: Specialty;
  price: number;
  currency: string;
  location: {
    city: string;
    venue: string;
    address: string;
  };
  startDate: string;
  endDate: string;
  description: string;
  imageUrl: string;
  level: 'Basic' | 'Intermediate' | 'Advanced' | 'Master';
  agenda: DailyAgenda[];
  status: 'Draft' | 'Pending' | 'Published' | 'Rejected';
  capacity?: number;
}

export interface DailyAgenda {
  day: string;
  date: string;
  items: AgendaItem[];
}

export interface AgendaItem {
  time: string;
  activity: string;
  description?: string;
}

export interface Instructor {
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  credentials: string[];
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
  items: { name: string; quantity: number }[];
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Shipped' | 'Completed';
  date: string;
  shippingAddress?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}
