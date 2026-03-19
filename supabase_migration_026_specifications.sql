-- Migration 026: Specification Templates
-- Purpose: Structured specification parameters for products by category
-- Part of: Supplier Product Management Optimization - Phase 2

-- ============================================
-- 1. Create specification_definitions table
-- ============================================

CREATE TABLE IF NOT EXISTS specification_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- Parameter name (e.g., "材质", "尺寸")
    name_en TEXT,                          -- English name (e.g., "Material", "Size")
    unit TEXT,                             -- Unit of measurement (e.g., "mm", "kg", "V")
    input_type TEXT NOT NULL DEFAULT 'text' CHECK (input_type IN ('text', 'number', 'select', 'multiselect')),
    options TEXT[],                        -- Options for select/multiselect types
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    applicable_groups TEXT[] DEFAULT '{}', -- Which product groups this applies to (PowerTools, Implants, etc.)
    applicable_specialties TEXT[] DEFAULT '{}', -- Which specialties this applies to
    description TEXT,                      -- Helper text for suppliers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create specification_groups table
-- ============================================

CREATE TABLE IF NOT EXISTS specification_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- Group name (e.g., "基本参数", "电气参数")
    name_en TEXT,
    product_group TEXT NOT NULL,           -- ProductGroup: PowerTools, Implants, etc.
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Create group_specifications junction table
-- ============================================

CREATE TABLE IF NOT EXISTS group_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES specification_groups(id) ON DELETE CASCADE,
    spec_id UUID NOT NULL REFERENCES specification_definitions(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    UNIQUE(group_id, spec_id)
);

-- ============================================
-- 4. Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_spec_defs_input_type ON specification_definitions(input_type);
CREATE INDEX IF NOT EXISTS idx_spec_defs_applicable_groups ON specification_definitions USING GIN(applicable_groups);
CREATE INDEX IF NOT EXISTS idx_spec_groups_product_group ON specification_groups(product_group);
CREATE INDEX IF NOT EXISTS idx_group_specs_group_id ON group_specifications(group_id);
CREATE INDEX IF NOT EXISTS idx_group_specs_spec_id ON group_specifications(spec_id);

-- ============================================
-- 5. Enable RLS
-- ============================================

ALTER TABLE specification_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_specifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies - Public read, admin write
-- ============================================

-- Specification definitions
CREATE POLICY "spec_defs_select_policy" ON specification_definitions FOR SELECT USING (true);
CREATE POLICY "spec_defs_insert_policy" ON specification_definitions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "spec_defs_update_policy" ON specification_definitions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "spec_defs_delete_policy" ON specification_definitions FOR DELETE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Specification groups
CREATE POLICY "spec_groups_select_policy" ON specification_groups FOR SELECT USING (true);
CREATE POLICY "spec_groups_insert_policy" ON specification_groups FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "spec_groups_update_policy" ON specification_groups FOR UPDATE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "spec_groups_delete_policy" ON specification_groups FOR DELETE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Group specifications
CREATE POLICY "group_specs_select_policy" ON group_specifications FOR SELECT USING (true);
CREATE POLICY "group_specs_insert_policy" ON group_specifications FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "group_specs_update_policy" ON group_specifications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "group_specs_delete_policy" ON group_specifications FOR DELETE
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin'));

-- ============================================
-- 7. Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_spec_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spec_defs_updated_at_trigger
    BEFORE UPDATE ON specification_definitions
    FOR EACH ROW EXECUTE FUNCTION update_spec_tables_updated_at();

CREATE TRIGGER spec_groups_updated_at_trigger
    BEFORE UPDATE ON specification_groups
    FOR EACH ROW EXECUTE FUNCTION update_spec_tables_updated_at();

-- ============================================
-- 8. Seed default specification definitions
-- ============================================

-- Power Tools specifications
INSERT INTO specification_definitions (name, name_en, unit, input_type, options, applicable_groups, is_required, display_order, description) VALUES
-- Power Tools - Basic
('转速范围', 'Speed Range', 'rpm', 'text', '{}', ARRAY['PowerTools'], true, 1, '空载转速范围'),
('扭矩', 'Torque', 'N·cm', 'text', '{}', ARRAY['PowerTools'], true, 2, '最大输出扭矩'),
('功率', 'Power', 'W', 'number', '{}', ARRAY['PowerTools'], false, 3, '额定功率'),
('电压', 'Voltage', 'V', 'select', ARRAY['110V', '220V', '可切换'], ARRAY['PowerTools'], false, 4, '工作电压'),
('重量', 'Weight', 'g', 'number', '{}', ARRAY['PowerTools'], false, 5, '主机重量'),
('电池类型', 'Battery Type', NULL, 'select', ARRAY['锂电池', '镍氢电池', '无电池(有线)'], ARRAY['PowerTools'], false, 6, '电池类型'),
('电池续航', 'Battery Life', '分钟', 'number', '{}', ARRAY['PowerTools'], false, 7, '满电续航时间'),
('灭菌方式', 'Sterilization', NULL, 'select', ARRAY['高温高压', '低温等离子', '不可灭菌'], ARRAY['PowerTools'], true, 8, '推荐灭菌方式'),
('手柄类型', 'Handle Type', NULL, 'select', ARRAY['直柄', '弯柄', '枪式'], ARRAY['PowerTools'], false, 9, '手柄形状类型'),

-- Implants specifications
('材质', 'Material', NULL, 'select', ARRAY['钛合金', '不锈钢', '钴铬钼合金', 'PEEK', '可吸收材料'], ARRAY['Implants'], true, 1, '植入物材料'),
('尺寸', 'Size', 'mm', 'text', '{}', ARRAY['Implants'], true, 2, '产品尺寸规格'),
('适用动物', 'Applicable Animals', NULL, 'multiselect', ARRAY['犬', '猫', '兔', '鸟类', '爬行动物'], ARRAY['Implants'], false, 3, '适用动物种类'),
('植入部位', 'Implant Location', NULL, 'select', ARRAY['股骨', '胫骨', '肱骨', '骨盆', '脊柱', '其他'], ARRAY['Implants'], false, 4, '主要植入部位'),
('认证', 'Certification', NULL, 'multiselect', ARRAY['CE认证', 'FDA认证', 'NMPA认证', 'ISO13485'], ARRAY['Implants'], false, 5, '产品认证'),

-- Hand Instruments specifications
('总长度', 'Total Length', 'mm', 'number', '{}', ARRAY['HandInstruments'], false, 1, '器械总长度'),
('工作端长度', 'Working Length', 'mm', 'number', '{}', ARRAY['HandInstruments'], false, 2, '工作端长度'),
('材质', 'Material', NULL, 'select', ARRAY['不锈钢', '钛合金', '碳纤维', '其他'], ARRAY['HandInstruments'], true, 3, '主要材质'),
('表面处理', 'Surface Finish', NULL, 'select', ARRAY['镜面抛光', '哑光处理', '涂层处理'], ARRAY['HandInstruments'], false, 4, '表面处理工艺'),
('是否可灭菌', 'Sterilizable', NULL, 'select', ARRAY['是', '否'], ARRAY['HandInstruments'], true, 5, '是否可重复灭菌'),

-- Consumables specifications
('包装规格', 'Package Size', NULL, 'text', '{}', ARRAY['Consumables'], true, 1, '包装数量/规格'),
('有效期', 'Shelf Life', '月', 'number', '{}', ARRAY['Consumables'], false, 2, '产品有效期'),
('灭菌状态', 'Sterile Status', NULL, 'select', ARRAY['无菌', '非无菌'], ARRAY['Consumables'], true, 3, '出厂灭菌状态'),
('储存条件', 'Storage Condition', NULL, 'text', '{}', ARRAY['Consumables'], false, 4, '推荐储存条件'),

-- Equipment specifications
('尺寸(长x宽x高)', 'Dimensions', 'mm', 'text', '{}', ARRAY['Equipment'], false, 1, '设备外形尺寸'),
('功率', 'Power', 'W', 'number', '{}', ARRAY['Equipment'], false, 2, '额定功率'),
('电压', 'Voltage', 'V', 'select', ARRAY['110V', '220V', '可切换'], ARRAY['Equipment'], false, 3, '工作电压'),
('重量', 'Weight', 'kg', 'number', '{}', ARRAY['Equipment'], false, 4, '设备重量'),
('保修期', 'Warranty', '年', 'number', '{}', ARRAY['Equipment'], false, 5, '产品保修期限');

-- ============================================
-- 9. Seed specification groups
-- ============================================

INSERT INTO specification_groups (name, name_en, product_group, display_order) VALUES
('基本参数', 'Basic Parameters', 'PowerTools', 1),
('电气参数', 'Electrical Parameters', 'PowerTools', 2),
('使用参数', 'Usage Parameters', 'PowerTools', 3),
('基本参数', 'Basic Parameters', 'Implants', 1),
('适用范围', 'Application Scope', 'Implants', 2),
('认证信息', 'Certifications', 'Implants', 3),
('尺寸参数', 'Dimensions', 'HandInstruments', 1),
('材质信息', 'Material Info', 'HandInstruments', 2),
('包装信息', 'Package Info', 'Consumables', 1),
('储存信息', 'Storage Info', 'Consumables', 2),
('设备参数', 'Device Parameters', 'Equipment', 1),
('服务信息', 'Service Info', 'Equipment', 2);

-- ============================================
-- 10. Link specifications to groups
-- ============================================

-- PowerTools - Basic Parameters
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'PowerTools' AND g.name = '基本参数'
AND s.name IN ('转速范围', '扭矩', '重量', '手柄类型')
AND s.applicable_groups @> ARRAY['PowerTools'];

-- PowerTools - Electrical Parameters
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'PowerTools' AND g.name = '电气参数'
AND s.name IN ('功率', '电压', '电池类型', '电池续航')
AND s.applicable_groups @> ARRAY['PowerTools'];

-- PowerTools - Usage Parameters
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'PowerTools' AND g.name = '使用参数'
AND s.name IN ('灭菌方式')
AND s.applicable_groups @> ARRAY['PowerTools'];

-- Implants - Basic Parameters
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Implants' AND g.name = '基本参数'
AND s.name IN ('材质', '尺寸')
AND s.applicable_groups @> ARRAY['Implants'];

-- Implants - Application Scope
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Implants' AND g.name = '适用范围'
AND s.name IN ('适用动物', '植入部位')
AND s.applicable_groups @> ARRAY['Implants'];

-- Implants - Certifications
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Implants' AND g.name = '认证信息'
AND s.name IN ('认证')
AND s.applicable_groups @> ARRAY['Implants'];

-- HandInstruments - Dimensions
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'HandInstruments' AND g.name = '尺寸参数'
AND s.name IN ('总长度', '工作端长度')
AND s.applicable_groups @> ARRAY['HandInstruments'];

-- HandInstruments - Material Info
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'HandInstruments' AND g.name = '材质信息'
AND s.name IN ('材质', '表面处理', '是否可灭菌')
AND s.applicable_groups @> ARRAY['HandInstruments'];

-- Consumables - Package Info
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Consumables' AND g.name = '包装信息'
AND s.name IN ('包装规格', '灭菌状态')
AND s.applicable_groups @> ARRAY['Consumables'];

-- Consumables - Storage Info
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Consumables' AND g.name = '储存信息'
AND s.name IN ('有效期', '储存条件')
AND s.applicable_groups @> ARRAY['Consumables'];

-- Equipment - Device Parameters
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Equipment' AND g.name = '设备参数'
AND s.name IN ('尺寸(长x宽x高)', '功率', '电压', '重量')
AND s.applicable_groups @> ARRAY['Equipment'];

-- Equipment - Service Info
INSERT INTO group_specifications (group_id, spec_id, display_order, is_required)
SELECT g.id, s.id, s.display_order, s.is_required
FROM specification_groups g
CROSS JOIN specification_definitions s
WHERE g.product_group = 'Equipment' AND g.name = '服务信息'
AND s.name IN ('保修期')
AND s.applicable_groups @> ARRAY['Equipment'];

-- ============================================
-- 11. Comments
-- ============================================

COMMENT ON TABLE specification_definitions IS 'Master definitions of specification parameters';
COMMENT ON TABLE specification_groups IS 'Groups of specifications organized by product type';
COMMENT ON TABLE group_specifications IS 'Junction table linking specs to groups with display order';
COMMENT ON COLUMN specification_definitions.input_type IS 'text: free text input; number: numeric input; select: single choice dropdown; multiselect: multiple choice';
COMMENT ON COLUMN specification_definitions.options IS 'Array of options for select/multiselect input types';
