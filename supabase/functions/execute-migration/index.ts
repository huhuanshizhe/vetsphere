import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Execute migration SQL
    const sql = `
      -- Add weight fields
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'g' CHECK (weight_unit IN ('g', 'kg', 'lb'));

      -- Add price fields
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS suggested_retail_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

      -- Add constraint
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_selling_price'
        ) THEN
          ALTER TABLE public.products 
          ADD CONSTRAINT check_selling_price 
          CHECK (selling_price IS NULL OR price IS NULL OR selling_price >= price);
        END IF;
      END $$;

      -- Add GEO content fields
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS meta_title TEXT,
      ADD COLUMN IF NOT EXISTS meta_description TEXT,
      ADD COLUMN IF NOT EXISTS focus_keyword TEXT;

      -- Add comments
      COMMENT ON COLUMN public.products.weight IS '产品重量';
      COMMENT ON COLUMN public.products.weight_unit IS '重量单位：g(克), kg(千克), lb(磅)';
      COMMENT ON COLUMN public.products.suggested_retail_price IS '建议销售价（供应商填写）';
      COMMENT ON COLUMN public.products.selling_price IS '销售定价（最终商城价格，必填，不能低于供货价）';
      COMMENT ON COLUMN public.products.faq IS 'FAQ 问答数组';
      COMMENT ON COLUMN public.products.meta_title IS 'SEO 元标题';
      COMMENT ON COLUMN public.products.meta_description IS 'SEO 元描述';
      COMMENT ON COLUMN public.products.focus_keyword IS 'SEO 核心关键词';

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight);
      CREATE INDEX IF NOT EXISTS idx_products_selling_price ON products(selling_price);
      CREATE INDEX IF NOT EXISTS idx_products_faq ON products USING GIN(faq);
    `

    // Execute via SQL endpoint
    const { data, error } = await supabaseClient.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migration executed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
