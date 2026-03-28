#!/bin/bash

# Supabase API credentials
SUPABASE_URL="https://tvxrgbntiksskywsroax.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHJnYm50aWtzc2t5d3Nyb2F4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0NTcxMiwiZXhwIjoyMDg2NDIxNzEyfQ.4MJZdR7l2OmAtW1gXpXvJtk5LFqXN7Y8kn7NiFtzsc8"

# SQL to execute
SQL="
-- 更新 get_spec_templates 函数，自动处理 ID 和 slug
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
) AS \$\$
DECLARE
  v_actual_category_id TEXT;
  v_actual_subcategory_id TEXT;
  v_actual_level3_category_id TEXT;
BEGIN
  v_actual_category_id := CASE 
    WHEN p_category_id LIKE 'cat-%' THEN substring(p_category_id FROM 5)
    ELSE p_category_id
  END;
  
  v_actual_subcategory_id := CASE 
    WHEN p_subcategory_id LIKE 'cat-%' THEN substring(p_subcategory_id FROM 5)
    ELSE p_subcategory_id
  END;
  
  v_actual_level3_category_id := CASE 
    WHEN p_level3_category_id LIKE 'cat-%' THEN substring(p_level3_category_id FROM 5)
    ELSE p_level3_category_id
  END;
  
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
    t.category_id = v_actual_category_id
    AND (v_actual_subcategory_id IS NULL OR t.subcategory_id = v_actual_subcategory_id OR t.subcategory_id IS NULL)
    AND (v_actual_level3_category_id IS NULL OR t.level3_category_id = v_actual_level3_category_id OR t.level3_category_id IS NULL)
  ORDER BY t.usage_count DESC, t.display_order ASC;
END;
\$\$ LANGUAGE plpgsql;
"

# Execute SQL via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: tx=commit" \
  -d "{\"query\": \"${SQL}\"}"

echo ""
echo "SQL executed"
