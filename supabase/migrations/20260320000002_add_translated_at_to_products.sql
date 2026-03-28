-- 添加翻译完成时间戳字段到 products 表
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;
