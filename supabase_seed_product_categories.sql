-- ============================================
-- Seed: Veterinary Marketplace Categories
-- ============================================
-- 完整兽医商城三级分类数据 (~120 categories)

-- ==========================================
-- Level 1 Categories
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-consumables', '耗材', 'Consumables', 'consumables', 1, NULL, '🧤', 1, 'global', true),
('cat-surgical', '手术器械', 'Surgical Instruments', 'surgical-instruments', 1, NULL, '🔪', 2, 'global', true),
('cat-diagnostics', '诊断设备', 'Diagnostics', 'diagnostics', 1, NULL, '🔬', 3, 'global', true),
('cat-monitoring', '监护设备', 'Monitoring', 'monitoring', 1, NULL, '📊', 4, 'global', true),
('cat-rehabilitation', '康复设备', 'Rehabilitation', 'rehabilitation', 1, NULL, '🏃', 5, 'global', true),
('cat-clinic', '诊所设备', 'Clinic Equipment', 'clinic-equipment', 1, NULL, '🏥', 6, 'global', true),
('cat-pet-care', '宠物医疗', 'Pet Medical Care', 'pet-medical-care', 1, NULL, '🐾', 7, 'global', true),
('cat-laboratory', '实验室', 'Laboratory', 'laboratory', 1, NULL, '🧪', 8, 'global', true),
('cat-dental', '牙科设备', 'Dental Equipment', 'dental-equipment', 1, NULL, '🦷', 9, 'global', true),
('cat-imaging', '影像设备', 'Imaging Equipment', 'imaging-equipment', 1, NULL, '📷', 10, 'global', true),
('cat-emergency', '急救设备', 'Emergency Care', 'emergency-care', 1, NULL, '🚨', 11, 'global', true),
('cat-hospital', '医院耗材', 'Hospital Supplies', 'hospital-supplies', 1, NULL, '🏨', 12, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Consumables
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-gloves', '手套', 'Gloves', 'gloves', 2, 'cat-consumables', '🧤', 1, 'global', true),
('cat-syringes', '注射器', 'Syringes', 'syringes', 2, 'cat-consumables', '💉', 2, 'global', true),
('cat-needles', '针头', 'Needles', 'needles', 2, 'cat-consumables', '📍', 3, 'global', true),
('cat-catheters', '导管', 'Catheters', 'catheters', 2, 'cat-consumables', '🔗', 4, 'global', true),
('cat-bandages', '绷带', 'Bandages', 'bandages', 2, 'cat-consumables', '🩹', 5, 'global', true),
('cat-gauze', '纱布', 'Gauze', 'gauze', 2, 'cat-consumables', '🧻', 6, 'global', true),
('cat-sutures', '缝合线', 'Sutures', 'sutures', 2, 'cat-consumables', '🪡', 7, 'global', true),
('cat-drapes', '手术铺巾', 'Drapes', 'drapes', 2, 'cat-consumables', '📋', 8, 'global', true),
('cat-iv-sets', '输液器', 'IV Sets', 'iv-sets', 2, 'cat-consumables', '💧', 9, 'global', true),
('cat-medical-tapes', '医用胶带', 'Medical Tapes', 'medical-tapes', 2, 'cat-consumables', '📼', 10, 'global', true),
('cat-sample-collection', '样本采集', 'Sample Collection', 'sample-collection', 2, 'cat-consumables', '🧫', 11, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Gloves
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-nitrile-gloves', '丁腈手套', 'Nitrile Gloves', 'nitrile-gloves', 3, 'cat-gloves', NULL, 1, 'global', true),
('cat-latex-gloves', '乳胶手套', 'Latex Gloves', 'latex-gloves', 3, 'cat-gloves', NULL, 2, 'global', true),
('cat-vinyl-gloves', '乙烯基手套', 'Vinyl Gloves', 'vinyl-gloves', 3, 'cat-gloves', NULL, 3, 'global', true),
('cat-sterile-surgical-gloves', '无菌手术手套', 'Sterile Surgical Gloves', 'sterile-surgical-gloves', 3, 'cat-gloves', NULL, 4, 'global', true),
('cat-examination-gloves', '检查手套', 'Examination Gloves', 'examination-gloves', 3, 'cat-gloves', NULL, 5, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Syringes
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-disposable-syringes', '一次性注射器', 'Disposable Syringes', 'disposable-syringes', 3, 'cat-syringes', NULL, 1, 'global', true),
('cat-insulin-syringes', '胰岛素注射器', 'Insulin Syringes', 'insulin-syringes', 3, 'cat-syringes', NULL, 2, 'global', true),
('cat-luer-lock-syringes', '鲁尔锁注射器', 'Luer Lock Syringes', 'luer-lock-syringes', 3, 'cat-syringes', NULL, 3, 'global', true),
('cat-luer-slip-syringes', '鲁尔滑注射器', 'Luer Slip Syringes', 'luer-slip-syringes', 3, 'cat-syringes', NULL, 4, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Needles
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-hypodermic-needles', '皮下注射针', 'Hypodermic Needles', 'hypodermic-needles', 3, 'cat-needles', NULL, 1, 'global', true),
('cat-spinal-needles', '脊椎针', 'Spinal Needles', 'spinal-needles', 3, 'cat-needles', NULL, 2, 'global', true),
('cat-biopsy-needles', '活检针', 'Biopsy Needles', 'biopsy-needles', 3, 'cat-needles', NULL, 3, 'global', true),
('cat-blood-collection-needles', '采血针', 'Blood Collection Needles', 'blood-collection-needles', 3, 'cat-needles', NULL, 4, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Catheters
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-iv-catheters', '静脉导管', 'IV Catheters', 'iv-catheters', 3, 'cat-catheters', NULL, 1, 'global', true),
('cat-urinary-catheters', '导尿管', 'Urinary Catheters', 'urinary-catheters', 3, 'cat-catheters', NULL, 2, 'global', true),
('cat-central-venous-catheters', '中心静脉导管', 'Central Venous Catheters', 'central-venous-catheters', 3, 'cat-catheters', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Bandages
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-elastic-bandages', '弹性绷带', 'Elastic Bandages', 'elastic-bandages', 3, 'cat-bandages', NULL, 1, 'global', true),
('cat-cohesive-bandages', '自粘绷带', 'Cohesive Bandages', 'cohesive-bandages', 3, 'cat-bandages', NULL, 2, 'global', true),
('cat-adhesive-bandages', '粘性绷带', 'Adhesive Bandages', 'adhesive-bandages', 3, 'cat-bandages', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Gauze
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-gauze-pads', '纱布垫', 'Gauze Pads', 'gauze-pads', 3, 'cat-gauze', NULL, 1, 'global', true),
('cat-gauze-rolls', '纱布卷', 'Gauze Rolls', 'gauze-rolls', 3, 'cat-gauze', NULL, 2, 'global', true),
('cat-sterile-gauze', '无菌纱布', 'Sterile Gauze', 'sterile-gauze', 3, 'cat-gauze', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Sutures
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-absorbable-sutures', '可吸收缝线', 'Absorbable Sutures', 'absorbable-sutures', 3, 'cat-sutures', NULL, 1, 'global', true),
('cat-non-absorbable-sutures', '不可吸收缝线', 'Non-Absorbable Sutures', 'non-absorbable-sutures', 3, 'cat-sutures', NULL, 2, 'global', true),
('cat-suture-needles', '缝合针', 'Suture Needles', 'suture-needles', 3, 'cat-sutures', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Surgical Instruments
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-scissors', '手术剪', 'Scissors', 'scissors', 2, 'cat-surgical', '✂️', 1, 'global', true),
('cat-forceps', '手术镊', 'Forceps', 'forceps', 2, 'cat-surgical', '🔧', 2, 'global', true),
('cat-needle-holders', '持针器', 'Needle Holders', 'needle-holders', 2, 'cat-surgical', '🪝', 3, 'global', true),
('cat-scalpels', '手术刀', 'Scalpels', 'scalpels', 2, 'cat-surgical', '🔪', 4, 'global', true),
('cat-retractors', '牵开器', 'Retractors', 'retractors', 2, 'cat-surgical', '↔️', 5, 'global', true),
('cat-hemostats', '止血钳', 'Hemostats', 'hemostats', 2, 'cat-surgical', '🔴', 6, 'global', true),
('cat-bone-instruments', '骨科器械', 'Bone Instruments', 'bone-instruments', 2, 'cat-surgical', '🦴', 7, 'global', true),
('cat-surgical-kits', '手术套装', 'Surgical Kits', 'surgical-kits', 2, 'cat-surgical', '📦', 8, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Scissors
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-operating-scissors', '手术剪', 'Operating Scissors', 'operating-scissors', 3, 'cat-scissors', NULL, 1, 'global', true),
('cat-iris-scissors', '虹膜剪', 'Iris Scissors', 'iris-scissors', 3, 'cat-scissors', NULL, 2, 'global', true),
('cat-bandage-scissors', '绷带剪', 'Bandage Scissors', 'bandage-scissors', 3, 'cat-scissors', NULL, 3, 'global', true),
('cat-metzenbaum-scissors', '梅氏剪', 'Metzenbaum Scissors', 'metzenbaum-scissors', 3, 'cat-scissors', NULL, 4, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Forceps
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-tissue-forceps', '组织镊', 'Tissue Forceps', 'tissue-forceps', 3, 'cat-forceps', NULL, 1, 'global', true),
('cat-dressing-forceps', '敷料镊', 'Dressing Forceps', 'dressing-forceps', 3, 'cat-forceps', NULL, 2, 'global', true),
('cat-thumb-forceps', '拇指镊', 'Thumb Forceps', 'thumb-forceps', 3, 'cat-forceps', NULL, 3, 'global', true),
('cat-allis-forceps', '鼠齿镊', 'Allis Forceps', 'allis-forceps', 3, 'cat-forceps', NULL, 4, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Needle Holders
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-mayo-hegar-holders', 'Mayo-Hegar持针器', 'Mayo-Hegar Needle Holders', 'mayo-hegar-needle-holders', 3, 'cat-needle-holders', NULL, 1, 'global', true),
('cat-olsen-hegar-holders', 'Olsen-Hegar持针器', 'Olsen-Hegar Needle Holders', 'olsen-hegar-needle-holders', 3, 'cat-needle-holders', NULL, 2, 'global', true),
('cat-micro-needle-holders', '显微持针器', 'Micro Needle Holders', 'micro-needle-holders', 3, 'cat-needle-holders', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Scalpels
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-scalpel-handles', '手术刀柄', 'Scalpel Handles', 'scalpel-handles', 3, 'cat-scalpels', NULL, 1, 'global', true),
('cat-scalpel-blades', '手术刀片', 'Scalpel Blades', 'scalpel-blades', 3, 'cat-scalpels', NULL, 2, 'global', true),
('cat-disposable-scalpels', '一次性手术刀', 'Disposable Scalpels', 'disposable-scalpels', 3, 'cat-scalpels', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Diagnostics
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-ultrasound', '超声设备', 'Ultrasound', 'ultrasound', 2, 'cat-diagnostics', '📡', 1, 'global', true),
('cat-microscopes', '显微镜', 'Microscopes', 'microscopes', 2, 'cat-diagnostics', '🔬', 2, 'global', true),
('cat-rapid-test-kits', '快速检测试剂', 'Rapid Test Kits', 'rapid-test-kits', 2, 'cat-diagnostics', '🧬', 3, 'global', true),
('cat-otoscope', '耳镜', 'Otoscope', 'otoscope', 2, 'cat-diagnostics', '👁️', 4, 'global', true),
('cat-ophthalmoscope', '检眼镜', 'Ophthalmoscope', 'ophthalmoscope', 2, 'cat-diagnostics', '👀', 5, 'global', true),
('cat-ecg', '心电图机', 'ECG', 'ecg', 2, 'cat-diagnostics', '📈', 6, 'global', true),
('cat-blood-analyzer', '血液分析仪', 'Blood Analyzer', 'blood-analyzer', 2, 'cat-diagnostics', '🩸', 7, 'global', true),
('cat-biochemistry-analyzer', '生化分析仪', 'Biochemistry Analyzer', 'biochemistry-analyzer', 2, 'cat-diagnostics', '⚗️', 8, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Ultrasound
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-portable-ultrasound', '便携式超声', 'Portable Ultrasound', 'portable-ultrasound', 3, 'cat-ultrasound', NULL, 1, 'global', true),
('cat-handheld-ultrasound', '手持超声', 'Handheld Ultrasound', 'handheld-ultrasound', 3, 'cat-ultrasound', NULL, 2, 'global', true),
('cat-color-doppler-ultrasound', '彩超', 'Color Doppler Ultrasound', 'color-doppler-ultrasound', 3, 'cat-ultrasound', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Rapid Test Kits
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-parvovirus-test-kits', '细小病毒检测试剂', 'Parvovirus Test Kits', 'parvovirus-test-kits', 3, 'cat-rapid-test-kits', NULL, 1, 'global', true),
('cat-distemper-test-kits', '犬瘟热检测试剂', 'Distemper Test Kits', 'distemper-test-kits', 3, 'cat-rapid-test-kits', NULL, 2, 'global', true),
('cat-feline-leukemia-test-kits', '猫白血病检测试剂', 'Feline Leukemia Test Kits', 'feline-leukemia-test-kits', 3, 'cat-rapid-test-kits', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Monitoring
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-patient-monitors', '病人监护仪', 'Patient Monitors', 'patient-monitors', 2, 'cat-monitoring', '📺', 1, 'global', true),
('cat-infusion-pumps', '输液泵', 'Infusion Pumps', 'infusion-pumps', 2, 'cat-monitoring', '💧', 2, 'global', true),
('cat-syringe-pumps', '注射泵', 'Syringe Pumps', 'syringe-pumps', 2, 'cat-monitoring', '💉', 3, 'global', true),
('cat-oxygen-therapy', '氧疗设备', 'Oxygen Therapy', 'oxygen-therapy', 2, 'cat-monitoring', '🫁', 4, 'global', true),
('cat-anesthesia-monitors', '麻醉监护仪', 'Anesthesia Monitors', 'anesthesia-monitors', 2, 'cat-monitoring', '😴', 5, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Patient Monitors
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-multi-parameter-monitors', '多参数监护仪', 'Multi-parameter Monitors', 'multi-parameter-monitors', 3, 'cat-patient-monitors', NULL, 1, 'global', true),
('cat-portable-monitors', '便携监护仪', 'Portable Monitors', 'portable-monitors', 3, 'cat-patient-monitors', NULL, 2, 'global', true),
('cat-icu-monitors', 'ICU监护仪', 'ICU Monitors', 'icu-monitors', 3, 'cat-patient-monitors', NULL, 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Rehabilitation
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-laser-therapy', '激光治疗', 'Laser Therapy', 'laser-therapy', 2, 'cat-rehabilitation', '💡', 1, 'global', true),
('cat-hydrotherapy', '水疗', 'Hydrotherapy', 'hydrotherapy', 2, 'cat-rehabilitation', '🌊', 2, 'global', true),
('cat-physiotherapy', '理疗', 'Physiotherapy', 'physiotherapy', 2, 'cat-rehabilitation', '💆', 3, 'global', true),
('cat-rehab-equipment', '康复器材', 'Rehab Equipment', 'rehab-equipment', 2, 'cat-rehabilitation', '🏃', 4, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Rehabilitation
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-veterinary-laser-therapy', '兽医激光治疗', 'Veterinary Laser Therapy', 'veterinary-laser-therapy', 3, 'cat-laser-therapy', NULL, 1, 'global', true),
('cat-underwater-treadmill', '水下跑步机', 'Underwater Treadmill', 'underwater-treadmill', 3, 'cat-hydrotherapy', NULL, 1, 'global', true),
('cat-balance-boards', '平衡板', 'Balance Boards', 'balance-boards', 3, 'cat-rehab-equipment', NULL, 1, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Clinic Equipment
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-operating-tables', '手术台', 'Operating Tables', 'operating-tables', 2, 'cat-clinic', '🛏️', 1, 'global', true),
('cat-exam-tables', '检查台', 'Exam Tables', 'exam-tables', 2, 'cat-clinic', '🪑', 2, 'global', true),
('cat-cages', '笼具', 'Cages', 'cages', 2, 'cat-clinic', '🏠', 3, 'global', true),
('cat-lighting', '照明设备', 'Lighting', 'lighting', 2, 'cat-clinic', '💡', 4, 'global', true),
('cat-sterilization', '消毒设备', 'Sterilization', 'sterilization', 2, 'cat-clinic', '🔥', 5, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- Level 3: Clinic Equipment
INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-electric-operating-tables', '电动手术台', 'Electric Operating Tables', 'electric-operating-tables', 3, 'cat-operating-tables', NULL, 1, 'global', true),
('cat-hydraulic-tables', '液压手术台', 'Hydraulic Tables', 'hydraulic-tables', 3, 'cat-operating-tables', NULL, 2, 'global', true),
('cat-led-surgical-lights', 'LED手术灯', 'LED Surgical Lights', 'led-surgical-lights', 3, 'cat-lighting', NULL, 1, 'global', true),
('cat-autoclaves', '高压灭菌器', 'Autoclaves', 'autoclaves', 3, 'cat-sterilization', NULL, 1, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Dental Equipment
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-dental-scalers', '洁牙机', 'Dental Scalers', 'dental-scalers', 2, 'cat-dental', '🦷', 1, 'global', true),
('cat-dental-units', '牙科治疗台', 'Dental Units', 'dental-units', 2, 'cat-dental', '🦷', 2, 'global', true),
('cat-dental-instruments', '牙科器械', 'Dental Instruments', 'dental-instruments', 2, 'cat-dental', '🦷', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Imaging Equipment
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-x-ray', 'X光机', 'X-Ray', 'x-ray', 2, 'cat-imaging', '📷', 1, 'global', true),
('cat-dr-systems', 'DR系统', 'DR Systems', 'dr-systems', 2, 'cat-imaging', '🖥️', 2, 'global', true),
('cat-imaging-accessories', '影像配件', 'Imaging Accessories', 'imaging-accessories', 2, 'cat-imaging', '🔌', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Emergency Care
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-resuscitation', '复苏设备', 'Resuscitation', 'resuscitation', 2, 'cat-emergency', '❤️', 1, 'global', true),
('cat-ventilators', '呼吸机', 'Ventilators', 'ventilators', 2, 'cat-emergency', '🌬️', 2, 'global', true),
('cat-defibrillators', '除颤仪', 'Defibrillators', 'defibrillators', 2, 'cat-emergency', '⚡', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Pet Medical Care
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-wound-care', '伤口护理', 'Wound Care', 'wound-care', 2, 'cat-pet-care', '🩹', 1, 'global', true),
('cat-e-collars', '伊丽莎白圈', 'E-Collars', 'e-collars', 2, 'cat-pet-care', '🔔', 2, 'global', true),
('cat-recovery-products', '康复用品', 'Recovery Products', 'recovery-products', 2, 'cat-pet-care', '🏥', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Laboratory
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-centrifuges', '离心机', 'Centrifuges', 'centrifuges', 2, 'cat-laboratory', '🔄', 1, 'global', true),
('cat-incubators', '培养箱', 'Incubators', 'incubators', 2, 'cat-laboratory', '🌡️', 2, 'global', true),
('cat-lab-consumables', '实验室耗材', 'Lab Consumables', 'lab-consumables', 2, 'cat-laboratory', '🧫', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Level 2: Hospital Supplies
-- ==========================================

INSERT INTO public.product_categories (id, name, name_en, slug, level, parent_id, icon, sort_order, site_code, is_active) VALUES
('cat-medical-furniture', '医疗家具', 'Medical Furniture', 'medical-furniture', 2, 'cat-hospital', '🪑', 1, 'global', true),
('cat-storage-solutions', '存储方案', 'Storage Solutions', 'storage-solutions', 2, 'cat-hospital', '🗄️', 2, 'global', true),
('cat-cleaning-supplies', '清洁用品', 'Cleaning Supplies', 'cleaning-supplies', 2, 'cat-hospital', '🧹', 3, 'global', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 验证
-- ==========================================
SELECT 
  level,
  COUNT(*) as count
FROM public.product_categories
GROUP BY level
ORDER BY level;
