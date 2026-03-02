-- ==========================================
-- VetSphere Seed Data Script
-- Populates products, courses, and course_product_relations
-- Run AFTER all migrations (001-012) have been applied
-- Uses ON CONFLICT to be idempotent (safe to re-run)
-- ==========================================

BEGIN;

-- ==========================================
-- 1. PRODUCTS (8 items)
-- ==========================================

INSERT INTO products (id, name, brand, price, specialty, group_category, image_url, description, specs, stock_status, purchase_mode, clinical_category, certifications, category_slug)
VALUES
  ('p1', 'TPLO High-Torque Saw System', 'SurgiTech', 15800, 'Orthopedics', 'PowerTools',
   'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=600&q=80',
   'German-engineered oscillating saw optimized for TPLO procedures with low vibration and high torque.',
   '{"No-load Speed":"0-15000 rpm","Weight":"820g","Sterilization":"134°C Autoclave","Noise Level":"<65dB"}'::jsonb,
   'In Stock', 'hybrid', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"DE-2024-0891","issuer":"TÜV SÜD","validUntil":"2027-12"},{"type":"CE","number":"CE-0123-SAW","issuer":"BSI","validUntil":"2027-06"}]'::jsonb,
   'surgery-anesthesia'),

  ('p2', 'Titanium Locking Plate System 2.4/2.7/3.5mm', 'VetOrtho', 1250, 'Orthopedics', 'Implants',
   'https://images.unsplash.com/photo-1583483425070-cb9ce8fc51b5?auto=format&fit=crop&w=600&q=80',
   'Medical Grade 5 Titanium locking plates designed for superior biological stability.',
   '{"Material":"Ti-6Al-4V ELI","Surface":"Anodized (Type II)","Thickness":"2.4mm - 3.8mm"}'::jsonb,
   'In Stock', 'direct', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"CN-2024-TLP-02","issuer":"SGS","validUntil":"2027-09"}]'::jsonb,
   'surgery-anesthesia'),

  ('p3', 'Micro-Ophthalmic Forceps (Straight/Curved)', 'PrecisionEye', 1880, 'Eye Surgery', 'HandInstruments',
   'https://images.unsplash.com/photo-1579154235602-4c202ff39040?auto=format&fit=crop&w=600&q=80',
   'Swiss-crafted tips designed for delicate corneal and intraocular maneuvers.',
   '{"Length":"115mm","Tip Size":"0.1mm","Material":"Non-magnetic Stainless Steel"}'::jsonb,
   'Low Stock', 'direct', 'surgery-anesthesia',
   '[{"type":"FDA 510(k)","number":"K241234","issuer":"FDA","validUntil":"2028-03"}]'::jsonb,
   'surgery-anesthesia'),

  ('p4', 'PGA Absorbable Sutures (Braided)', 'SutureExpert', 580, 'Soft Tissue', 'Consumables',
   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
   'Box of 12. Excellent knot security and minimal tissue reaction.',
   '{"Sizes":"2-0 / 3-0 / 4-0","Length":"75cm","Needle":"Reverse Cutting 3/8"}'::jsonb,
   'In Stock', 'direct', 'daily-supplies',
   NULL,
   'daily-supplies'),

  ('p5', 'VetSono Pro Portable Ultrasound', 'VetSono', 28500, 'Ultrasound', 'PowerTools',
   'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80',
   'Compact portable ultrasound with 12MHz linear and 5MHz convex probes. Ideal for small animal abdominal and cardiac imaging.',
   '{"Probes":"12MHz Linear + 5MHz Convex","Display":"15.6\" HD LED","Weight":"5.2kg","Battery":"3h continuous"}'::jsonb,
   'In Stock', 'inquiry', 'imaging-diagnostics',
   '[{"type":"ISO 13485","number":"JP-2024-USP-05","issuer":"JQA","validUntil":"2028-01"},{"type":"CE","number":"CE-0197-USP","issuer":"TÜV Rheinland"}]'::jsonb,
   'imaging-diagnostics'),

  ('p6', 'Multi-Frequency Ultrasound Probe Set (3/7/12MHz)', 'VetSono', 8900, 'Ultrasound', 'PowerTools',
   'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
   'Professional probe set covering abdominal, cardiac, and musculoskeletal imaging. Compatible with VetSono Pro and most major brands.',
   '{"Frequencies":"3 / 7 / 12 MHz","Cable Length":"2.1m","Connector":"Universal USB-C"}'::jsonb,
   'In Stock', 'direct', 'imaging-diagnostics',
   NULL,
   'imaging-diagnostics'),

  ('p7', 'Phacoemulsification System VetPhaco-3000', 'PrecisionEye', 45000, 'Eye Surgery', 'PowerTools',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
   'Complete phacoemulsification unit with integrated vitrectomy function. Designed specifically for veterinary cataract surgery.',
   '{"Phaco Frequency":"40kHz","Vacuum":"0-650mmHg","Aspiration":"0-65cc/min","Display":"10.1\" Touchscreen"}'::jsonb,
   'In Stock', 'inquiry', 'surgery-anesthesia',
   '[{"type":"FDA 510(k)","number":"K240567","issuer":"FDA","validUntil":"2028-06"},{"type":"ISO 13485","number":"US-2024-PHC-07","issuer":"NSF International"}]'::jsonb,
   'surgery-anesthesia'),

  ('p8', 'Arthroscopy Tower System VetScope-HD', 'SurgiTech', 38000, 'Orthopedics', 'PowerTools',
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
   'Full HD arthroscopy system with 2.7mm and 4.0mm scopes, LED light source, and fluid management pump.',
   '{"Resolution":"1920x1080 Full HD","Scope Diameter":"2.7mm / 4.0mm","Light Source":"LED 50W","Recording":"4K/1080p USB"}'::jsonb,
   'In Stock', 'hybrid', 'surgery-anesthesia',
   '[{"type":"ISO 13485","number":"DE-2024-ART-08","issuer":"TÜV SÜD","validUntil":"2027-11"},{"type":"CE","number":"CE-0123-ART","issuer":"BSI"}]'::jsonb,
   'surgery-anesthesia')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  price = EXCLUDED.price,
  specialty = EXCLUDED.specialty,
  group_category = EXCLUDED.group_category,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  stock_status = EXCLUDED.stock_status,
  purchase_mode = EXCLUDED.purchase_mode,
  clinical_category = EXCLUDED.clinical_category,
  certifications = EXCLUDED.certifications,
  category_slug = EXCLUDED.category_slug;

-- ==========================================
-- 2. COURSES (4 items)
-- ==========================================

INSERT INTO courses (id, title, description, specialty, level, price, currency, start_date, end_date, location, instructor, image_url, status, max_enrollment, current_enrollment, enrollment_deadline, target_audience, target_audience_zh, total_hours, agenda)
VALUES
  ('csavs-ultra-basic-2026',
   'CSAVS Veterinary Ultrasound - Basic (腹部超声系列·基础班)',
   'Systematic training on abdominal ultrasound physics, artifact recognition, and standard organ scanning protocols.',
   'Ultrasound', 'Basic', 9800, 'CNY',
   '2026-03-30', '2026-04-03',
   '{"city":"Maanshan, China","venue":"CSAVS Practical Training Center","address":"Next to Maanshan East Railway Station (High Speed Rail)"}'::jsonb,
   '{"name":"Femke Bosma","title":"DVM, DECVDI","credentials":["European Specialist in Veterinary Diagnostic Imaging"],"imageUrl":"https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Femke Bosma graduated from Utrecht University in 2016. She joined the Animal Medical Center in Amsterdam and later completed her residency in radiology under Maartje Passon and Tessa Köning. She successfully passed the ECVDI certification exams in 2021."}'::jsonb,
   'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
   'Published', 12, 0, '2026-03-15',
   'Small Animal Veterinarians', '小动物临床兽医', 40,
   '[{"day":"Day 1","date":"March 30","items":[{"time":"09:00-12:00","activity":"Basic Ultrasound Physics: How is the US image created? Types of Ultrasound Probes. Settings adjustment (Depth, Focus, Gain)."},{"time":"13:00-17:00","activity":"Artifacts: Recognition and mitigation. Probe handling techniques & standardization. Practical Session."}]},{"day":"Day 2","date":"March 31","items":[{"time":"09:00-12:00","activity":"Liver & Biliary System: Normal hepatobiliary anatomy. Focal and diffuse hepatic lesions. Gallbladder mucocele."},{"time":"13:00-17:00","activity":"Pancreas: Identifying the pancreas. Pancreatitis and neoplasia. Spleen: Normal anatomy and common pathologies. Practical."}]},{"day":"Day 3","date":"April 1","items":[{"time":"09:00-12:00","activity":"Urogenital System: Kidneys, Ureters, Bladder. Chronic renal changes, neoplasia. Adrenal Glands identification."},{"time":"13:00-17:00","activity":"Retroperitoneal Space: Anatomy and common pathology. Practical Session."}]},{"day":"Day 4","date":"April 2","items":[{"time":"09:00-12:00","activity":"Gastrointestinal Tract: Normal anatomy of GIT segments. Motility. Ileus, Intussusception, Foreign bodies."},{"time":"13:00-17:00","activity":"Abdominal Lymph Nodes: Identification and differentiation of reactive vs metastatic nodes. Practical."}]},{"day":"Day 5","date":"April 3","items":[{"time":"09:00-12:00","activity":"Abdominal Vasculature: Aorta, Vena Cava, Portal Vein. Doppler usage. Peritoneum & Ascites."},{"time":"13:00-17:00","activity":"Ultrasound-guided Interventions: Cystocentesis, FNAs, Biopsy techniques. Safety precautions. Practical."}]}]'::jsonb),

  ('csavs-soft-2026',
   'CSAVS Practical Soft Tissue Surgery (软组织外科实操课程)',
   'Intensive hands-on workshop covering Liver Lobectomy, Thoracic Surgery, and Reconstructive Skin Flaps.',
   'Soft Tissue', 'Advanced', 4800, 'CNY',
   '2026-03-18', '2026-03-20',
   '{"city":"Nanjing, China","venue":"Nanjing Agricultural Univ. Teaching Hospital","address":"4th Floor Practical Center, New District"}'::jsonb,
   '{"name":"Joachim Proot","title":"DVM, CertSAS, DECVS","credentials":["European Specialist in Small Animal Surgery"],"imageUrl":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&h=400&q=80","bio":"Joachim possesses 15 years of specialized surgical experience in referral tertiary care centers across the UK. He serves as the Chair of Soft Tissue Surgery at IVC Evidensia. His courses are highly regarded for their practicality."}'::jsonb,
   'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
   'Published', 16, 0, '2026-03-01',
   'Small Animal Surgeons', '小动物外科兽医', 24,
   '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-15:00","activity":"Liver lobectomy using staplers"},{"time":"15:00-15:30","activity":"Diaphragmotomy to improve access to the liver"},{"time":"15:30-16:00","activity":"Duodenotomy and catheterisation of the common bile duct"},{"time":"16:30-18:00","activity":"Cholecystoduodenostomy & Cholecystectomy. Removal of sublumbar lymph nodes."}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-10:00","activity":"Intercostal thoracotomy & Sternotomy"},{"time":"10:00-11:00","activity":"Lung lobectomy"},{"time":"11:00-12:00","activity":"Pericardectomy"},{"time":"13:00-15:00","activity":"Total ear canal ablation (TECA)"},{"time":"15:00-17:30","activity":"Ventral bulla osteotomy"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-10:00","activity":"Axial pattern flaps"},{"time":"10:00-10:30","activity":"Subdermal plexus flaps"},{"time":"10:30-12:00","activity":"Free skin graft"},{"time":"13:00-17:30","activity":"Practical: Axial pattern flaps & Subdermal plexus flaps"}]}]'::jsonb),

  ('csavs-eye-2026',
   'European Veterinary Ophthalmology Certification VOSC-China (欧洲兽医眼科认证)',
   'Advanced Corneal Suturing, Reconstruction, and Phacoemulsification techniques.',
   'Eye Surgery', 'Master', 15000, 'CNY',
   '2026-01-03', '2026-01-05',
   '{"city":"Shanghai, China","venue":"I-VET Ophthalmology Training Center","address":"738 Shangcheng Road, Pudong New Area"}'::jsonb,
   '{"name":"Rick F. Sanchez","title":"DVM, DECVO, CertVetEd","credentials":["European Specialist in Veterinary Ophthalmology"],"imageUrl":"https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&h=400&q=80","bio":"Rick is a pioneering veterinarian in applying suture burying techniques for corneal surgery. He re-established the Ophthalmology service at the RVC (Royal Veterinary College) in 2011 and is the editor of An Atlas of Ophthalmic Surgery."}'::jsonb,
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
   'Published', 10, 0, '2025-12-15',
   'Veterinary Ophthalmologists', '兽医眼科医生', 32,
   '[{"day":"Day 1","date":"Jan 3","items":[{"time":"09:00-10:00","activity":"Micro-ophthalmic instrument selection & magnification systems"},{"time":"10:10-11:40","activity":"Understanding corneal suture patterns & achieving excellence"},{"time":"12:40-14:10","activity":"Use of buried knots in corneal surgery"},{"time":"14:20-17:00","activity":"Practical Session: Advanced Corneal Suturing"}]},{"day":"Day 2","date":"Jan 4","items":[{"time":"09:00-10:00","activity":"Superficial keratectomy, laceration repair and iris prolapse"},{"time":"10:00-11:00","activity":"Conjunctival pedicle grafting and use of support pedicles"},{"time":"11:10-12:10","activity":"Corneoconjunctival Transpositions (CLCTS)"},{"time":"13:10-14:10","activity":"Use of Biomaterials"},{"time":"14:20-17:00","activity":"Practical Session: Advanced Corneal Reconstruction"}]},{"day":"Day 3","date":"Jan 5","items":[{"time":"09:00-10:00","activity":"The uncomplicated phacoemulsification"},{"time":"10:00-11:30","activity":"Problem solving I: Anterior capsulorrhexis and lens content removal"},{"time":"12:30-14:00","activity":"Problem solving II: Capsular tension ring (CTR) and IOL implant"},{"time":"14:00-15:30","activity":"Problem solving III: Aspiration of viscoelastic & corneal wound closure"},{"time":"16:30-17:00","activity":"Practical Session: Phacoemulsification techniques"}]}]'::jsonb),

  ('csavs-joint-2026',
   'CSAVS Practical Joint Surgery Workshop (关节外科实操课程)',
   'Mastering joint surgery: Bandaging, reduction of luxations, arthrotomy principles, and basic arthroscopy.',
   'Orthopedics', 'Advanced', 4800, 'CNY',
   '2026-03-18', '2026-03-20',
   '{"city":"Maanshan, China","venue":"CSAVS Training Center","address":"Maanshan, Anhui Province"}'::jsonb,
   '{"name":"Antonio Pozzi","title":"DVM, DECVS, DACVS, DACVSMR","credentials":["Director of Small Animal Surgery at University of Zurich"],"imageUrl":"https://images.unsplash.com/photo-1531891437567-317ff7fd9008?auto=format&fit=crop&w=400&h=400&q=80","bio":"Dr. Antonio Pozzi is a world-renowned specialist in neurosurgery, orthopedics, and sports medicine. His research team focuses on One Health and joint biomechanics. He has previously held faculty positions at the University of Florida."}'::jsonb,
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
   'Published', 20, 0, '2026-03-01',
   'Small Animal Veterinarians', '小动物临床兽医', 40,
   '[{"day":"Day 1","date":"March 18","items":[{"time":"14:30-16:00","activity":"Bandaging: how to perform bandages, splints, slings for joint diseases (Lecture)"},{"time":"16:30-18:00","activity":"Arthrotomy: Basic principles on how to perform an arthrotomy (Lecture)"}]},{"day":"Day 2","date":"March 19","items":[{"time":"08:30-10:00","activity":"How to perform an orthopedic examination: laxity tests, joint palpation (Practical)"},{"time":"10:30-12:00","activity":"Closed reduction of a luxation (Hip) and applying different bandages (Modified Robert Jones, Ehmer, Splints) (Practical)"},{"time":"13:00-14:30","activity":"Arthroscopy: Introduction to basic arthroscopy (Practical)"},{"time":"15:00-17:30","activity":"Basic Arthroscopy introduction continued (Practical)"}]},{"day":"Day 3","date":"March 20","items":[{"time":"08:30-10:00","activity":"Stifle arthrotomy: From surgical anatomy to joint exploration (Practical)"},{"time":"10:30-12:00","activity":"Stifle arthrotomy continued (Practical)"},{"time":"13:00-14:30","activity":"Arthroscopy: Arthroscopic assisted arthrotomy (Practical)"},{"time":"15:00-17:30","activity":"Arthroscopy: Other applications (Practical)"}]}]'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  specialty = EXCLUDED.specialty,
  level = EXCLUDED.level,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  location = EXCLUDED.location,
  instructor = EXCLUDED.instructor,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status,
  max_enrollment = EXCLUDED.max_enrollment,
  enrollment_deadline = EXCLUDED.enrollment_deadline,
  target_audience = EXCLUDED.target_audience,
  target_audience_zh = EXCLUDED.target_audience_zh,
  total_hours = EXCLUDED.total_hours,
  agenda = EXCLUDED.agenda;

-- ==========================================
-- 3. COURSE-PRODUCT RELATIONS (23 items)
-- ==========================================

-- Clear existing relations to avoid duplicates (idempotent)
DELETE FROM course_product_relations
WHERE course_id IN ('csavs-ultra-basic-2026', 'csavs-soft-2026', 'csavs-eye-2026', 'csavs-joint-2026');

-- Ultrasound Basic (6 relations)
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja)
VALUES
  ('csavs-ultra-basic-2026', 'p5', 'required', 'course', NULL, 1,
   'Primary ultrasound unit used throughout the course',
   'เครื่องอัลตราซาวด์หลักที่ใช้ตลอดหลักสูตร',
   'コース全体で使用するメイン超音波ユニット'),
  ('csavs-ultra-basic-2026', 'p6', 'required', 'module', 1, 2,
   'Multi-frequency probes for physics & artifact exercises',
   'โพรบหลายความถี่สำหรับฝึกฟิสิกส์และอาร์ติแฟกต์',
   '物理学とアーチファクト演習用マルチ周波数プローブ'),
  ('csavs-ultra-basic-2026', 'p6', 'required', 'module', 3, 3,
   'High-frequency probe for kidney & adrenal imaging',
   'โพรบความถี่สูงสำหรับภาพไตและต่อมหมวกไต',
   '腎臓・副腎イメージング用高周波プローブ'),
  ('csavs-ultra-basic-2026', 'p6', 'required', 'module', 5, 4,
   'Doppler-capable probes for vascular assessment',
   'โพรบที่รองรับ Doppler สำหรับประเมินหลอดเลือด',
   '血管評価用ドップラー対応プローブ'),
  ('csavs-ultra-basic-2026', 'p4', 'recommended', 'module', 5, 5,
   'Sutures for ultrasound-guided FNA practice',
   'ไหมเย็บสำหรับฝึก FNA ด้วยอัลตราซาวด์',
   '超音波ガイド下FNA練習用縫合糸'),
  ('csavs-ultra-basic-2026', 'p1', 'mentioned', 'instructor', NULL, 6,
   'Dr. Bosma recommends for clinics expanding to surgical services',
   'Dr. Bosma แนะนำสำหรับคลินิกที่ขยายบริการศัลยกรรม',
   'Bosma先生が手術サービス拡大クリニックに推奨');

-- Soft Tissue Surgery (5 relations)
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja)
VALUES
  ('csavs-soft-2026', 'p4', 'required', 'course', NULL, 1,
   'Essential sutures for all soft tissue procedures',
   'ไหมเย็บที่จำเป็นสำหรับหัตถการเนื้อเยื่ออ่อนทั้งหมด',
   '全軟部組織手技に必須の縫合糸'),
  ('csavs-soft-2026', 'p1', 'required', 'module', 1, 2,
   'Liver lobectomy using powered stapler system',
   'การตัดกลีบตับด้วยระบบ stapler แบบมีกำลัง',
   'パワーステープラーシステムによる肝葉切除'),
  ('csavs-soft-2026', 'p3', 'recommended', 'module', 2, 3,
   'Fine forceps for pericardectomy and TECA procedures',
   'คีมละเอียดสำหรับการตัดเยื่อหุ้มหัวใจและ TECA',
   '心膜切除術とTECA手技用精密鉗子'),
  ('csavs-soft-2026', 'p2', 'recommended', 'module', 3, 4,
   'Mini plates for reconstructive flap stabilization',
   'แผ่นเพลทขนาดเล็กเพื่อยึดแผ่นเนื้อเยื่อในการสร้างใหม่',
   '再建皮弁の固定用ミニプレート'),
  ('csavs-soft-2026', 'p5', 'mentioned', 'instructor', NULL, 5,
   'Dr. Proot recommends intraoperative ultrasound for hepatic surgery',
   'Dr. Proot แนะนำอัลตราซาวด์ระหว่างผ่าตัดสำหรับศัลยกรรมตับ',
   'Proot先生が肝臓手術における術中超音波を推奨');

-- Ophthalmology (5 relations)
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja)
VALUES
  ('csavs-eye-2026', 'p3', 'required', 'course', NULL, 1,
   'Primary micro-forceps used in all ophthalmic practicals',
   'คีมจุลภาคหลักที่ใช้ในการฝึกปฏิบัติทางจักษุทั้งหมด',
   '全眼科実習で使用する主要マイクロ鉗子'),
  ('csavs-eye-2026', 'p7', 'required', 'module', 3, 2,
   'Phaco system for Day 3 cataract surgery practicals',
   'ระบบ Phaco สำหรับฝึกผ่าตัดต้อกระจกวันที่ 3',
   '3日目白内障手術実習用Phacoシステム'),
  ('csavs-eye-2026', 'p4', 'required', 'module', 1, 3,
   '8-0 / 9-0 sutures for corneal suturing exercises',
   'ไหมเย็บ 8-0 / 9-0 สำหรับฝึกเย็บกระจกตา',
   '角膜縫合練習用8-0/9-0縫合糸'),
  ('csavs-eye-2026', 'p4', 'required', 'module', 2, 4,
   'Sutures for corneal reconstruction and graft techniques',
   'ไหมเย็บสำหรับเทคนิคการสร้างกระจกตาใหม่และการปลูกถ่าย',
   '角膜再建・移植技術用縫合糸'),
  ('csavs-eye-2026', 'p5', 'mentioned', 'instructor', NULL, 5,
   'Dr. Sanchez recommends ocular ultrasound for pre-surgical lens assessment',
   'Dr. Sanchez แนะนำอัลตราซาวด์ตาสำหรับประเมินเลนส์ก่อนผ่าตัด',
   'Sanchez先生が術前水晶体評価に眼科超音波を推奨');

-- Joint Surgery (7 relations)
INSERT INTO course_product_relations (course_id, product_id, relationship_type, relation_type, day_index, display_order, instructor_note_en, instructor_note_th, instructor_note_ja)
VALUES
  ('csavs-joint-2026', 'p8', 'required', 'course', NULL, 1,
   'Full arthroscopy tower for practical sessions',
   'ระบบอาร์โทรสโคปีครบชุดสำหรับฝึกปฏิบัติ',
   '実習セッション用フル関節鏡タワー'),
  ('csavs-joint-2026', 'p1', 'required', 'module', 2, 2,
   'Power tools for arthrotomy approach demonstration',
   'เครื่องมือไฟฟ้าสำหรับสาธิตวิธีเข้า arthrotomy',
   '関節切開アプローチデモンストレーション用パワーツール'),
  ('csavs-joint-2026', 'p2', 'required', 'module', 3, 3,
   'Locking plates for stifle arthrotomy stabilization',
   'แผ่นเพลทล็อคสำหรับยึดการตัดข้อเข่า',
   '膝関節切開安定化用ロッキングプレート'),
  ('csavs-joint-2026', 'p8', 'required', 'module', 2, 4,
   'Arthroscope 2.7mm for basic joint exploration',
   'กล้องอาร์โทรสโคป 2.7 มม. สำหรับสำรวจข้อต่อเบื้องต้น',
   '基本関節探索用2.7mm関節鏡'),
  ('csavs-joint-2026', 'p8', 'required', 'module', 3, 5,
   'Arthroscope 4.0mm for advanced stifle procedures',
   'กล้องอาร์โทรสโคป 4.0 มม. สำหรับหัตถการข้อเข่าขั้นสูง',
   '高度膝関節手技用4.0mm関節鏡'),
  ('csavs-joint-2026', 'p4', 'recommended', 'module', 3, 6,
   'Sutures for post-arthrotomy wound closure',
   'ไหมเย็บสำหรับปิดแผลหลัง arthrotomy',
   '関節切開後創閉鎖用縫合糸'),
  ('csavs-joint-2026', 'p5', 'mentioned', 'instructor', NULL, 7,
   'Dr. Pozzi recommends ultrasound for joint effusion assessment',
   'Dr. Pozzi แนะนำอัลตราซาวด์สำหรับประเมินน้ำในข้อ',
   'Pozzi先生が関節液貯留評価に超音波を推奨');

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check counts
DO $$
DECLARE
  prod_count INTEGER;
  course_count INTEGER;
  rel_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prod_count FROM products WHERE id IN ('p1','p2','p3','p4','p5','p6','p7','p8');
  SELECT COUNT(*) INTO course_count FROM courses WHERE id IN ('csavs-ultra-basic-2026','csavs-soft-2026','csavs-eye-2026','csavs-joint-2026');
  SELECT COUNT(*) INTO rel_count FROM course_product_relations WHERE course_id IN ('csavs-ultra-basic-2026','csavs-soft-2026','csavs-eye-2026','csavs-joint-2026');
  
  RAISE NOTICE 'Seed data loaded: % products, % courses, % course-product relations', prod_count, course_count, rel_count;
END $$;

COMMIT;
