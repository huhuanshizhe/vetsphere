
-- ==========================================
-- VetSphere Complete Database Schema (Production)
-- Last updated: 2026-03-02
-- Description: Authoritative schema reflecting all migrations (001-007)
-- ==========================================

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

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- ==========================================
-- 2. USER_PROFILES (Extended Profile Data)
-- ==========================================
create table public.user_profiles (
  id uuid references auth.users(id) primary key,
  display_name text,
  avatar_url text,
  hospital text,
  specialty text,
  bio text,
  phone text,
  role text default 'Doctor',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;
create policy "Users can view all profiles" on user_profiles for select using (true);
create policy "Users can update own profile" on user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on user_profiles for insert with check (auth.uid() = id);

-- ==========================================
-- 3. PRODUCTS (Equipment)
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
  supplier_id uuid references auth.users(id),
  stock_status text default 'In Stock',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.products enable row level security;
create policy "Anyone can view products" on products for select using (true);
create policy "Suppliers can insert own products" on products for insert with check (auth.uid() = supplier_id);
create policy "Suppliers can update own products" on products for update using (auth.uid() = supplier_id);

create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_products_specialty on public.products(specialty);
create index if not exists idx_products_group on public.products(group_category);

-- ==========================================
-- 4. COURSES (Education)
-- ==========================================
create table public.courses (
  id text primary key,
  title text not null,
  description text,
  specialty text,
  level text,
  price numeric,
  currency text default 'USD',
  start_date date,
  end_date date,
  location jsonb,
  instructor jsonb,
  image_url text,
  provider_id uuid references auth.users(id),
  status text default 'Pending',
  agenda jsonb,
  -- Multi-language fields (zh/th from migration 004, ja/en from migration 006)
  title_zh text,
  title_th text,
  title_ja text,
  title_en text,
  description_zh text,
  description_th text,
  description_ja text,
  description_en text,
  -- Translation metadata (from migration 006)
  translations_complete boolean default false,
  translated_at timestamp with time zone,
  -- Capacity & enrollment (from migration 004)
  max_enrollment integer default 30,
  current_enrollment integer default 0,
  enrollment_deadline date,
  -- Metadata (from migration 004)
  target_audience text,
  target_audience_zh text,
  total_hours numeric,
  rejection_reason text,
  -- Course services (from migration 005)
  publish_language text default 'zh',
  teaching_languages jsonb default '[]',
  preview_video_url text,
  services jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.courses enable row level security;

create policy "Anyone can view courses" on courses for select using (true);
create policy "Providers can insert courses" on courses for insert with check (auth.uid() = provider_id);
create policy "Providers can update own courses" on courses for update using (auth.uid() = provider_id);
create policy "Providers can delete own courses" on courses for delete using (auth.uid() = provider_id);
create policy "Admins can manage all courses" on courses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);

create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_provider on public.courses(provider_id);
create index if not exists idx_courses_specialty on public.courses(specialty);

-- ==========================================
-- 5. ORDERS (Business Data)
-- ==========================================
create table public.orders (
  id text primary key,
  user_id uuid references auth.users(id),
  customer_name text,
  customer_email text,
  items jsonb,
  total_amount numeric,
  currency text default 'CNY',
  status text default 'Pending', -- 'Pending', 'Paid', 'Shipped', 'Completed', 'PaymentFailed'
  date text,                     -- Display date (YYYY-MM-DD)
  shipping_address text,
  -- Payment fields (from migration 007)
  payment_method text,           -- 'stripe', 'wechat', 'alipay', 'airwallex'
  payment_id text,               -- External payment transaction ID
  paid_amount numeric,           -- Actual paid amount
  paid_at timestamp with time zone,
  payment_status text default 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  -- Tracking fields (from migration 007)
  tracking_number text,
  shipping_carrier text,
  estimated_delivery text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;

create policy "Users can view own orders" on orders for select using (auth.uid() = user_id);
create policy "Users can create orders" on orders for insert with check (auth.uid() = user_id);
create policy "Admins can view all orders" on orders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);
create policy "Admins can update orders" on orders for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);
create policy "Suppliers can view relevant orders" on orders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'ShopSupplier')
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_payment_status on public.orders(payment_status);

-- ==========================================
-- 6. ORDER_TRACKING (Shipment Events)
-- ==========================================
create table public.order_tracking (
  id uuid default uuid_generate_v4() primary key,
  order_id text not null,
  status text not null,
  location text default '',
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.order_tracking enable row level security;

create policy "Users can view own order tracking" on order_tracking for select using (
  exists (select 1 from public.orders where orders.id = order_tracking.order_id and orders.user_id = auth.uid())
);
create policy "Admin can manage tracking" on order_tracking for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);
create policy "System insert tracking" on order_tracking for insert with check (true);

create index if not exists idx_order_tracking_order on public.order_tracking(order_id);

-- ==========================================
-- 7. SHIPPING TEMPLATES
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
create policy "Admins can manage shipping templates" on shipping_templates for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);

-- ==========================================
-- 8. COMMUNITY POSTS
-- ==========================================
create table public.posts (
  id text primary key,
  author_id uuid references auth.users(id),
  author_info jsonb,
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

create index if not exists idx_posts_author on public.posts(author_id);
create index if not exists idx_posts_specialty on public.posts(specialty);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

-- ==========================================
-- 9. POST_INTERACTIONS (Likes/Saves)
-- ==========================================
create table public.post_interactions (
  id uuid default uuid_generate_v4() primary key,
  post_id text not null,
  user_id uuid references auth.users(id) not null,
  interaction_type text not null, -- 'like', 'save'
  created_at timestamptz default now(),
  unique(post_id, user_id, interaction_type)
);

alter table public.post_interactions enable row level security;
create policy "Anyone can view interactions count" on post_interactions for select using (true);
create policy "Users can manage own interactions" on post_interactions for all using (auth.uid() = user_id);

create index if not exists idx_post_interactions_post on public.post_interactions(post_id);

-- ==========================================
-- 10. POST_COMMENTS
-- ==========================================
create table public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id text not null,
  user_id uuid references auth.users(id) not null,
  author_name text,
  author_avatar text,
  content text not null,
  parent_id uuid references post_comments(id),
  created_at timestamptz default now()
);

alter table public.post_comments enable row level security;
create policy "Anyone can view comments" on post_comments for select using (true);
create policy "Users can create comments" on post_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on post_comments for delete using (auth.uid() = user_id);

create index if not exists idx_post_comments_post on public.post_comments(post_id);

-- ==========================================
-- 11. USER_POINTS
-- ==========================================
create table public.user_points (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) unique not null,
  total_points integer default 500,
  level text default 'Resident',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_points enable row level security;
create policy "Users can view own points" on user_points for select using (auth.uid() = user_id);
create policy "Users can insert own points" on user_points for insert with check (auth.uid() = user_id);
-- Note: Point updates are handled by award_user_points() SECURITY DEFINER function

-- ==========================================
-- 12. POINT_TRANSACTIONS
-- ==========================================
create table public.point_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  amount integer not null,
  reason text not null,
  balance_after integer,
  reference_id text,
  created_at timestamptz default now()
);

alter table public.point_transactions enable row level security;
create policy "Users can view own transactions" on point_transactions for select using (auth.uid() = user_id);
create policy "System can insert transactions" on point_transactions for insert with check (true);

create index if not exists idx_point_transactions_user on public.point_transactions(user_id);

-- ==========================================
-- 13. COURSE_ENROLLMENTS
-- ==========================================
create table public.course_enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  course_id text not null,
  order_id text,
  payment_status text default 'pending',
  enrollment_date timestamptz default now(),
  completion_status text default 'enrolled',
  certificate_issued boolean default false,
  certificate_url text,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

alter table public.course_enrollments enable row level security;
create policy "Users can view own enrollments" on course_enrollments for select using (auth.uid() = user_id);
create policy "Users can create enrollments" on course_enrollments for insert with check (auth.uid() = user_id);
create policy "System can update enrollments" on course_enrollments for update using (true);

create index if not exists idx_course_enrollments_user on public.course_enrollments(user_id);
create index if not exists idx_course_enrollments_course on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_order on public.course_enrollments(order_id);

-- ==========================================
-- 14. NOTIFICATIONS
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

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;

-- ==========================================
-- 15. FUNCTIONS
-- ==========================================

-- Award user points (SECURITY DEFINER bypasses RLS)
create or replace function award_user_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns table(new_total integer, new_level text)
language plpgsql
security definer
as $$
declare
  v_new_total integer;
  v_new_level text;
begin
  insert into user_points (user_id, total_points, level)
  values (p_user_id, 500, 'Resident')
  on conflict (user_id) do nothing;
  
  update user_points
  set total_points = total_points + p_amount, updated_at = now()
  where user_id = p_user_id
  returning total_points into v_new_total;
  
  v_new_level := case
    when v_new_total >= 10000 then 'Master'
    when v_new_total >= 5000 then 'Expert'
    when v_new_total >= 2000 then 'Senior'
    when v_new_total >= 1000 then 'Specialist'
    else 'Resident'
  end;
  
  update user_points set level = v_new_level where user_id = p_user_id;
  
  insert into point_transactions (user_id, amount, reason, balance_after)
  values (p_user_id, p_amount, p_reason, v_new_total);
  
  return query select v_new_total, v_new_level;
end;
$$;

-- Increment course enrollment count
create or replace function increment_course_enrollment(p_course_id text)
returns void
language plpgsql
security definer
as $$
begin
  update public.courses
  set current_enrollment = coalesce(current_enrollment, 0) + 1
  where id = p_course_id;
end;
$$;
