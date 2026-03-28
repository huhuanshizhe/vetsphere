-- Migration 029: Category Spec Templates
-- 为规格参数模板功能创建数据库表
-- 功能：自动保存和加载分类下的规格参数模板

-- ============================================
-- 1. 创建分类规格参数模板表
-- ============================================

-- 规格参数名模板表
CREATE TABLE IF NOT EXISTS category_spec_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,           -- 一级分类ID
  subcategory_id TEXT,                  -- 二级分类ID（可选）
  level3_category_id TEXT,              -- 三级分类ID（可选）
  spec_name TEXT NOT NULL,              -- 规格参数名称
  spec_name_en TEXT,                    -- 规格参数英文名
  unit TEXT,                            -- 单位
  input_type TEXT DEFAULT 'text',       -- 输入类型: text, number, select, multiselect
  is_required BOOLEAN DEFAULT false,    -- 是否必填
  display_order INTEGER DEFAULT 0,      -- 显示顺序
  usage_count INTEGER DEFAULT 1,        -- 使用次数（用于排序热门参数）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(category_id, subcategory_id, level3_category_id, spec_name)
);

-- 规格参数值模板表（存储历史使用过的值）
CREATE TABLE IF NOT EXISTS category_spec_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES category_spec_templates(id) ON DELETE CASCADE,
  spec_value TEXT NOT NULL,             -- 规格参数值
  usage_count INTEGER DEFAULT 1,        -- 使用次数
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(template_id, spec_value)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_spec_templates_category ON category_spec_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_spec_templates_subcategory ON category_spec_templates(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_spec_templates_level3 ON category_spec_templates(level3_category_id);
CREATE INDEX IF NOT EXISTS idx_spec_values_template ON category_spec_values(template_id);

-- ============================================
-- 2. 创建更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_spec_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_spec_template_updated_at ON category_spec_templates;
CREATE TRIGGER update_spec_template_updated_at
  BEFORE UPDATE ON category_spec_templates
  FOR EACH ROW EXECUTE FUNCTION update_spec_template_updated_at();

-- ============================================
-- 3. 创建RPC函数：保存规格参数模板
-- ============================================

CREATE OR REPLACE FUNCTION save_spec_templates(
  p_category_id TEXT,
  p_subcategory_id TEXT DEFAULT NULL,
  p_level3_category_id TEXT DEFAULT NULL,
  p_specs JSONB DEFAULT '[]'::jsonb
)
RETURNS void AS $$
DECLARE
  spec_item JSONB;
  template_id UUID;
  spec_name TEXT;
  spec_value TEXT;
BEGIN
  -- 遍历每个规格参数
  FOR spec_item IN SELECT * FROM jsonb_array_elements(p_specs)
  LOOP
    spec_name := spec_item->>'key';
    spec_value := spec_item->>'value';
    
    -- 跳过空值
    IF spec_name IS NULL OR spec_value IS NULL OR trim(spec_name) = '' OR trim(spec_value) = '' THEN
      CONTINUE;
    END IF;
    
    -- 插入或更新规格参数名模板
    INSERT INTO category_spec_templates (
      category_id, subcategory_id, level3_category_id, spec_name, input_type, display_order
    ) VALUES (
      p_category_id, p_subcategory_id, p_level3_category_id, trim(spec_name), 'text', 0
    )
    ON CONFLICT (category_id, subcategory_id, level3_category_id, spec_name)
    DO UPDATE SET
      usage_count = category_spec_templates.usage_count + 1,
      updated_at = now()
    RETURNING id INTO template_id;
    
    -- 插入或更新规格参数值
    INSERT INTO category_spec_values (template_id, spec_value)
    VALUES (template_id, trim(spec_value))
    ON CONFLICT (template_id, spec_value)
    DO UPDATE SET
      usage_count = category_spec_values.usage_count + 1;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. 创建RPC函数：获取规格参数模板
-- ============================================

CREATE OR REPLACE FUNCTION get_spec_templates(
  p_category_id TEXT,
  p_subcategory_id TEXT DEFAULT NULL,
  p_level3_category_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  spec_name TEXT,
  spec_name_en TEXT,
  unit TEXT,
  input_type TEXT,
  is_required BOOLEAN,
  display_order INTEGER,
  spec_values JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.spec_name,
    t.spec_name_en,
    t.unit,
    t.input_type,
    t.is_required,
    t.display_order,
    (
      SELECT jsonb_agg(v.spec_value ORDER BY v.usage_count DESC)
      FROM category_spec_values v
      WHERE v.template_id = t.id
    ) AS spec_values
  FROM category_spec_templates t
  WHERE 
    t.category_id = p_category_id
    AND (p_subcategory_id IS NULL OR t.subcategory_id = p_subcategory_id OR t.subcategory_id IS NULL)
    AND (p_level3_category_id IS NULL OR t.level3_category_id = p_level3_category_id OR t.level3_category_id IS NULL)
  ORDER BY t.usage_count DESC, t.display_order ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON TABLE category_spec_templates IS '分类规格参数模板表 - 存储每个分类下常用的规格参数名';
COMMENT ON TABLE category_spec_values IS '分类规格参数值表 - 存储每个规格参数名对应的历史使用值';
COMMENT ON FUNCTION save_spec_templates IS '保存商品的规格参数到模板（自动提取并记录）';
COMMENT ON FUNCTION get_spec_templates IS '获取分类下的规格参数模板（包含参数名和可选值）';