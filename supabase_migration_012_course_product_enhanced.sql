-- Migration 012: Enhance course-product relations with day index and relation type
-- Adds day_index for agenda-based grouping and relation_type for categorizing recommendations

-- Add day_index column (nullable, 1-based index matching agenda array)
ALTER TABLE course_product_relations ADD COLUMN IF NOT EXISTS day_index INTEGER;

-- Add relation_type column (course-level, module-level, or instructor recommendation)
ALTER TABLE course_product_relations ADD COLUMN IF NOT EXISTS relation_type TEXT DEFAULT 'course';

-- Add check constraint for relation_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cpr_relation_type_check'
  ) THEN
    ALTER TABLE course_product_relations ADD CONSTRAINT cpr_relation_type_check 
      CHECK (relation_type IN ('course', 'module', 'instructor'));
  END IF;
END $$;

-- Add index for day_index queries (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_cpr_day_index 
  ON course_product_relations(course_id, day_index) 
  WHERE day_index IS NOT NULL;

-- Add index for relation_type queries
CREATE INDEX IF NOT EXISTS idx_cpr_relation_type 
  ON course_product_relations(course_id, relation_type);

-- Documentation
COMMENT ON COLUMN course_product_relations.day_index IS 
  'Optional 1-based index matching course.agenda array position. NULL for general recommendations.';
COMMENT ON COLUMN course_product_relations.relation_type IS 
  'Categorizes relation: course (general), module (day-specific), instructor (personal recommendation)';
