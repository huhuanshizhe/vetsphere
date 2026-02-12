
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES (User Data)
-- ==========================================
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'Doctor', -- 'Doctor', 'ShopSupplier', 'CourseProvider', 'Admin'
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Public read, User edit own
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- ==========================================
-- 2. PRODUCTS (Equipment)
-- ==========================================
create table public.products (
  id text primary key,
  name text not null,
  brand text,
  price numeric,
  specialty text,
  group_category text, -- 'PowerTools', 'Implants' etc.
  image_url text,
  description text,
  specs jsonb,
  supplier_id uuid references auth.users(id), -- Owner of the product
  stock_status text default 'In Stock',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Everyone reads, Suppliers update own
alter table public.products enable row level security;
create policy "Anyone can view products" on products for select using (true);
create policy "Suppliers can insert own products" on products for insert with check (auth.uid() = supplier_id);
create policy "Suppliers can update own products" on products for update using (auth.uid() = supplier_id);

-- ==========================================
-- 3. COURSES (Education)
-- ==========================================
create table public.courses (
  id text primary key,
  title text not null,
  specialty text,
  level text,
  price numeric,
  start_date date,
  end_date date,
  location jsonb,
  instructor jsonb,
  image_url text,
  provider_id uuid references auth.users(id), -- Course Provider
  status text default 'Published',
  agenda jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Everyone reads, Providers update own
alter table public.courses enable row level security;
create policy "Anyone can view courses" on courses for select using (true);
create policy "Providers can manage own courses" on courses for all using (auth.uid() = provider_id);

-- ==========================================
-- 4. ORDERS (Business Data)
-- ==========================================
create table public.orders (
  id text primary key,
  user_id uuid references auth.users(id), -- The Buyer (Doctor)
  customer_name text,
  customer_email text,
  items jsonb, -- Array of items snapshot
  total_amount numeric,
  status text default 'Pending', -- 'Pending', 'Paid', 'Shipped'
  shipping_address text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Strict Access
alter table public.orders enable row level security;

-- Policy 1: Doctors can see their own orders
create policy "Users can view own orders" on orders for select
using (auth.uid() = user_id);

-- Policy 2: Doctors can create orders
create policy "Users can create orders" on orders for insert
with check (auth.uid() = user_id);

-- Policy 3: Admins can view all orders (assuming Admin has a specific role or ID check)
-- For simplicity, we assume a function or metadata check here, or manual grant.
-- create policy "Admins view all" on orders for select using (auth.jwt() ->> 'role' = 'Admin');

-- ==========================================
-- 5. SHIPPING TEMPLATES
-- ==========================================
create table public.shipping_templates (
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
create policy "Admins manage shipping" on shipping_templates for all using (true); -- In prod, restrict to Admin role

-- ==========================================
-- 6. COMMUNITY POSTS
-- ==========================================
create table public.posts (
  id text primary key,
  author_id uuid references auth.users(id),
  author_info jsonb, -- Snapshot of author name/avatar
  title text,
  content text,
  specialty text,
  media jsonb,
  stats jsonb default '{"likes": 0, "comments": 0, "saves": 0}',
  is_ai_analyzed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.posts enable row level security;
create policy "Public view posts" on posts for select using (true);
create policy "Users create posts" on posts for insert with check (auth.uid() = author_id);
create policy "Users update own posts" on posts for update using (auth.uid() = author_id);

-- ==========================================
-- 7. NOTIFICATIONS
-- ==========================================
create table public.notifications (
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
