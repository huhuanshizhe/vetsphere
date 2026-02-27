-- ============================================================
-- VetSphere Database Initialization Script
-- Execute this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES (User Data)
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'Doctor',
  avatar_url text,
  points integer default 500,
  level text default 'Resident',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Doctor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 2. PRODUCTS (Equipment)
-- ==========================================
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text,
  price numeric,
  specialty text,
  group_category text,
  image_url text,
  description text,
  long_description text,
  specs jsonb,
  compare_data jsonb,
  supplier_id uuid references auth.users(id),
  supplier_info jsonb,
  stock_status text default 'In Stock',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.products enable row level security;
create policy "Anyone can view products" on products for select using (true);
create policy "Suppliers can insert own products" on products for insert with check (true);
create policy "Suppliers can update own products" on products for update using (true);
create policy "Suppliers can delete own products" on products for delete using (true);

-- ==========================================
-- 3. COURSES (Education)
-- ==========================================
create table if not exists public.courses (
  id text primary key,
  title text not null,
  specialty text,
  level text,
  price numeric,
  currency text default 'CNY',
  start_date date,
  end_date date,
  location jsonb,
  instructor jsonb,
  image_url text,
  description text,
  provider_id uuid references auth.users(id),
  status text default 'Published',
  agenda jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.courses enable row level security;
create policy "Anyone can view courses" on courses for select using (true);
create policy "Providers can insert courses" on courses for insert with check (true);
create policy "Providers can update courses" on courses for update using (true);
create policy "Providers can delete courses" on courses for delete using (true);

-- ==========================================
-- 4. ORDERS (Business Data)
-- ==========================================
create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id),
  customer_name text,
  customer_email text,
  items jsonb,
  total_amount numeric,
  status text default 'Pending',
  date text,
  shipping_address text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;
create policy "Users can view own orders" on orders for select using (true);
create policy "Users can create orders" on orders for insert with check (true);
create policy "Admins can update orders" on orders for update using (true);

-- ==========================================
-- 5. SHIPPING TEMPLATES
-- ==========================================
create table if not exists public.shipping_templates (
  id text primary key,
  name text,
  region_code text,
  base_fee numeric,
  per_item_fee numeric,
  estimated_days text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.shipping_templates enable row level security;
create policy "Anyone can view shipping templates" on shipping_templates for select using (true);
create policy "Admins manage shipping" on shipping_templates for all using (true);

-- ==========================================
-- 6. COMMUNITY POSTS
-- ==========================================
create table if not exists public.posts (
  id text primary key,
  author_id uuid references auth.users(id),
  author_info jsonb,
  title text,
  content text,
  specialty text,
  media jsonb,
  patient_info jsonb,
  sections jsonb,
  stats jsonb default '{"likes": 0, "comments": 0, "saves": 0}',
  is_ai_analyzed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.posts enable row level security;
create policy "Public view posts" on posts for select using (true);
create policy "Users create posts" on posts for insert with check (true);
create policy "Users update own posts" on posts for update using (true);
create policy "Users delete own posts" on posts for delete using (true);

-- ==========================================
-- 7. NOTIFICATIONS
-- ==========================================
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references auth.users(id),
  type text,
  title text,
  message text,
  is_read boolean default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.notifications enable row level security;
create policy "Users see own notifications" on notifications for select using (auth.uid() = user_id);

-- ==========================================
-- 8. LEADS (AI Chat Leads)
-- ==========================================
create table if not exists public.leads (
  id text primary key,
  source text default 'AI Chat',
  contact_info text,
  interest_summary text,
  full_chat_log jsonb,
  status text default 'New',
  organization text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.leads enable row level security;
create policy "Anyone can create leads" on leads for insert with check (true);
create policy "Admins can view leads" on leads for select using (true);
create policy "Admins can update leads" on leads for update using (true);

-- ==========================================
-- 9. SEED DATA: COURSES
-- ==========================================
insert into public.courses (id, title, specialty, level, price, currency, start_date, end_date, location, instructor, image_url, description, status, agenda) values
(
  'csavs-ultra-basic-2026',
  'CSAVS Veterinary Ultrasound - Basic (腹部超声系列·基础班)',
  'Ultrasound', 'Basic', 9800, 'CNY',
  '2026-03-30', '2026-04-03',
  '{"city":"Maanshan, China","venue":"CSAVS Practical Training Center","address":"Next to Maanshan East Railway Station (High Speed Rail)"}',
  '{"name":"Femke Bosma","title":"DVM, DECVDI","credentials":["European Specialist in Veterinary Diagnostic Imaging"],"imageUrl":"https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Femke Bosma graduated from Utrecht University in 2016. She joined the Animal Medical Center in Amsterdam and later completed her residency in radiology."}',
  'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
  'Systematic training on abdominal ultrasound physics, artifact recognition, and standard organ scanning protocols.',
  'Published',
  '[{"day":"Day 1","date":"March 30","items":[{"time":"09:00-12:00","activity":"Basic Ultrasound Physics"},{"time":"13:00-17:00","activity":"Artifacts: Recognition and mitigation. Practical Session."}]},{"day":"Day 2","date":"March 31","items":[{"time":"09:00-12:00","activity":"Liver & Biliary System"},{"time":"13:00-17:00","activity":"Pancreas & Spleen. Practical."}]},{"day":"Day 3","date":"April 1","items":[{"time":"09:00-12:00","activity":"Urogenital System"},{"time":"13:00-17:00","activity":"Retroperitoneal Space. Practical."}]},{"day":"Day 4","date":"April 2","items":[{"time":"09:00-12:00","activity":"Gastrointestinal Tract"},{"time":"13:00-17:00","activity":"Abdominal Lymph Nodes. Practical."}]},{"day":"Day 5","date":"April 3","items":[{"time":"09:00-12:00","activity":"Abdominal Vasculature & Doppler"},{"time":"13:00-17:00","activity":"Ultrasound-guided Interventions. Practical."}]}]'
),
(
  'csavs-soft-2026',
  'CSAVS Practical Soft Tissue Surgery (软组织外科实操课程)',
  'Soft Tissue', 'Advanced', 4800, 'CNY',
  '2026-03-18', '2026-03-20',
  '{"city":"Nanjing, China","venue":"Nanjing Agricultural Univ. Teaching Hospital","address":"4th Floor Practical Center, New District"}',
  '{"name":"Joachim Proot","title":"DVM, CertSAS, DECVS","credentials":["European Specialist in Small Animal Surgery"],"imageUrl":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&h=400&q=80","bio":"Joachim possesses 15 years of specialized surgical experience in referral tertiary care centers across the UK."}',
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
  'Intensive hands-on workshop covering Liver Lobectomy, Thoracic Surgery, and Reconstructive Skin Flaps.',
  'Published',
  '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Liver lobectomy using staplers & Diaphragmotomy"},{"time":"16:30-18:00","activity":"Cholecystoduodenostomy & Cholecystectomy"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-12:00","activity":"Intercostal thoracotomy, Lung lobectomy, Pericardectomy"},{"time":"13:00-17:30","activity":"Total ear canal ablation (TECA) & Ventral bulla osteotomy"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Axial pattern flaps, Subdermal plexus flaps, Free skin graft"},{"time":"13:00-17:30","activity":"Practical: Flaps & grafts"}]}]'
),
(
  'csavs-eye-2026',
  'European Veterinary Ophthalmology Certification VOSC-China (欧洲兽医眼科认证)',
  'Eye Surgery', 'Master', 15000, 'CNY',
  '2026-01-03', '2026-01-05',
  '{"city":"Shanghai, China","venue":"I-VET Ophthalmology Training Center","address":"738 Shangcheng Road, Pudong New Area"}',
  '{"name":"Rick F. Sanchez","title":"DVM, DECVO, CertVetEd","credentials":["European Specialist in Veterinary Ophthalmology"],"imageUrl":"https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&h=400&q=80","bio":"Rick is a pioneering veterinarian in applying suture burying techniques for corneal surgery."}',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
  'Advanced Corneal Suturing, Reconstruction, and Phacoemulsification techniques.',
  'Published',
  '[{"day":"Day 1","date":"Jan 3","items":[{"time":"09:00-11:40","activity":"Micro-ophthalmic instruments & Corneal suture patterns"},{"time":"12:40-17:00","activity":"Buried knots in corneal surgery. Practical: Advanced Corneal Suturing."}]},{"day":"Day 2","date":"Jan 4","items":[{"time":"09:00-12:10","activity":"Superficial keratectomy, Conjunctival pedicle grafting, CLCTS"},{"time":"13:10-17:00","activity":"Biomaterials. Practical: Advanced Corneal Reconstruction."}]},{"day":"Day 3","date":"Jan 5","items":[{"time":"09:00-11:30","activity":"Phacoemulsification & Problem solving I/II"},{"time":"12:30-17:00","activity":"Problem solving III, IOL implant. Practical: Phaco techniques."}]}]'
),
(
  'csavs-joint-2026',
  'CSAVS Practical Joint Surgery Workshop (关节外科实操课程)',
  'Orthopedics', 'Advanced', 4800, 'CNY',
  '2026-03-18', '2026-03-20',
  '{"city":"Maanshan, China","venue":"CSAVS Training Center","address":"Maanshan, Anhui Province"}',
  '{"name":"Antonio Pozzi","title":"DVM, DECVS, DACVS, DACVSMR","credentials":["Director of Small Animal Surgery at University of Zurich"],"imageUrl":"https://images.unsplash.com/photo-1531891437567-317ff7fd9008?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Antonio Pozzi is a world-renowned specialist in neurosurgery, orthopedics, and sports medicine."}',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  'Mastering joint surgery: Bandaging, reduction of luxations, arthrotomy principles, and basic arthroscopy.',
  'Published',
  '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Bandaging: bandages, splints, slings for joint diseases"},{"time":"16:30-18:00","activity":"Arthrotomy: Basic principles"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-12:00","activity":"Orthopedic examination & Closed reduction of luxation (Hip)"},{"time":"13:00-17:30","activity":"Basic Arthroscopy introduction"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-12:00","activity":"Stifle arthrotomy: Surgical anatomy to joint exploration"},{"time":"13:00-17:30","activity":"Arthroscopic assisted arthrotomy & Other applications"}]}]'
)
on conflict (id) do nothing;

-- ==========================================
-- 10. SEED DATA: PRODUCTS
-- ==========================================
insert into public.products (id, name, brand, price, specialty, group_category, image_url, description, long_description, specs, supplier_info, stock_status) values
(
  'p1',
  'TPLO High-Torque Saw System',
  'SurgiTech', 15800, 'Orthopedics', 'PowerTools',
  'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80',
  'German-engineered oscillating saw optimized for TPLO procedures with low vibration and high torque.',
  'This system features a fully sealed waterproof design, supporting autoclave sterilization. Its unique quick-coupling interface fits major global saw blade brands.',
  '{"No-load Speed":"0-15000 rpm","Weight":"820g","Sterilization":"134°C Autoclave","Noise Level":"<65dB"}',
  '{"name":"SurgiTech Germany GmbH","origin":"Germany","rating":4.9}',
  'In Stock'
),
(
  'p2',
  'Titanium Locking Plate System 2.4/2.7/3.5mm',
  'VetOrtho', 1250, 'Orthopedics', 'Implants',
  'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80',
  'Medical Grade 5 Titanium locking plates designed for superior biological stability.',
  'The VetOrtho locking system is designed to minimize bone contact pressure, preserving periosteal blood supply.',
  '{"Material":"Ti-6Al-4V ELI","Surface":"Anodized (Type II)","Thickness":"2.4mm - 3.8mm"}',
  '{"name":"VetOrtho Precision Mfg","origin":"China","rating":4.8}',
  'In Stock'
),
(
  'p3',
  'Micro-Ophthalmic Forceps (Straight/Curved)',
  'PrecisionEye', 1880, 'Eye Surgery', 'HandInstruments',
  'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80',
  'Swiss-crafted tips designed for delicate corneal and intraocular maneuvers.',
  'Hand-finished tips (0.1mm) ensure ultimate tactile feedback under the microscope.',
  '{"Length":"115mm","Tip Size":"0.1mm","Material":"Non-magnetic Stainless Steel"}',
  '{"name":"Precision Eye Instruments","origin":"USA","rating":5.0}',
  'Low Stock'
),
(
  'p4',
  'PGA Absorbable Sutures (Braided)',
  'SutureExpert', 580, 'Soft Tissue', 'Consumables',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
  'Box of 12. Excellent knot security and minimal tissue reaction.',
  'PGA sutures degrade via hydrolysis, providing a stable wound support period (approx. 21-28 days).',
  '{"Sizes":"2-0 / 3-0 / 4-0","Length":"75cm","Needle":"Reverse Cutting 3/8"}',
  '{"name":"Global Medical Supplies","origin":"Germany","rating":4.7}',
  'In Stock'
)
on conflict (id) do nothing;

-- ==========================================
-- 11. SEED DATA: COMMUNITY POSTS
-- ==========================================
insert into public.posts (id, author_id, author_info, title, content, specialty, media, patient_info, sections, stats, is_ai_analyzed) values
(
  'case-001', null,
  '{"name":"Dr. Zhang","avatar":"https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=100&q=80","level":"Expert","hospital":"上海中心宠物医院"}',
  '复杂粉碎性股骨骨折的 TPLO + 锁定钢板联合固定',
  '患犬为3岁拉布拉多，遭遇车祸导致股骨远端粉碎性骨折，同时伴有交叉韧带断裂。我们采用了双板固定技术...',
  'Orthopedics',
  '[{"type":"image","url":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80"}]',
  '{"species":"Canine (Labrador)","age":"3y","weight":"32kg"}',
  '{"diagnosis":"Distal Femoral Comminuted Fracture","plan":"Dual Plate Fixation + TPLO Stabilization","outcome":"Post-op 8 weeks: Good weight bearing."}',
  '{"likes":42,"comments":12,"saves":28}',
  true
),
(
  'case-002', null,
  '{"name":"Dr. Emily Smith","avatar":"https://images.unsplash.com/photo-1559839734-2b71f1e59816?auto=format&fit=crop&w=100&q=80","level":"Surgeon","hospital":"London Vet Clinic"}',
  '神经外科：L3-L4 椎间盘突出导致的截瘫病例报告',
  '该病例展示了半椎板切除术在急性 IVDD 处理中的应用，术后配合高压氧治疗效果显著。',
  'Neurosurgery',
  '[{"type":"image","url":"https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80"}]',
  '{"species":"Canine (Dachshund)","age":"6y","weight":"8kg"}',
  '{"diagnosis":"Acute IVDD (Hansen Type I)","plan":"Hemilaminectomy at L3-L4","outcome":"Deep pain sensation recovered in 48h."}',
  '{"likes":35,"comments":8,"saves":15}',
  true
)
on conflict (id) do nothing;

-- ==========================================
-- 12. SEED DATA: SHIPPING TEMPLATES
-- ==========================================
insert into public.shipping_templates (id, name, region_code, base_fee, per_item_fee, estimated_days) values
('ship-cn', 'China Domestic Standard', 'CN', 15, 5, '3-5 business days'),
('ship-intl', 'International Standard', 'INTL', 120, 30, '7-14 business days'),
('ship-cn-express', 'China Express (SF)', 'CN', 25, 8, '1-2 business days')
on conflict (id) do nothing;

-- ==========================================
-- Done! All tables and seed data created.
-- ==========================================
