-- ============================================
-- Migration: Backfill and enforce INTL product site slugs
-- Date: 2026-05-16
-- Description:
-- 1. Generate readable unique slug_override values for existing INTL product site views
-- 2. Auto-generate slug_override for future INTL publishes when missing
-- 3. Enforce INTL slug_override uniqueness at the database layer
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_product_site_slug(p_value text)
RETURNS text AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(COALESCE(p_value, '')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )),
    ''
  );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.build_intl_product_site_slug_candidate(
  p_product_id text,
  p_display_name text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_product record;
BEGIN
  SELECT slug, slug_en, name, name_en
  INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  RETURN COALESCE(
    public.normalize_product_site_slug(v_product.slug_en),
    CASE
      WHEN v_product.slug IS NOT NULL AND v_product.slug !~ '^[0-9]+$'
        THEN public.normalize_product_site_slug(v_product.slug)
      ELSE NULL
    END,
    public.normalize_product_site_slug(p_display_name),
    public.normalize_product_site_slug(v_product.name_en),
    public.normalize_product_site_slug(v_product.name),
    p_product_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.ensure_unique_intl_product_site_slug(
  p_product_id text,
  p_candidate text
)
RETURNS text AS $$
DECLARE
  v_base_slug text := COALESCE(public.normalize_product_site_slug(p_candidate), p_product_id);
  v_resolved_slug text;
  v_suffix integer := 2;
BEGIN
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := p_product_id;
  END IF;

  v_resolved_slug := v_base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.product_site_views
    WHERE site_code = 'intl'
      AND slug_override = v_resolved_slug
      AND product_id <> p_product_id
  ) LOOP
    v_resolved_slug := format('%s-%s', v_base_slug, v_suffix);
    v_suffix := v_suffix + 1;
  END LOOP;

  RETURN v_resolved_slug;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_fill_intl_product_site_slug_override()
RETURNS trigger AS $$
BEGIN
  IF NEW.site_code <> 'intl' THEN
    RETURN NEW;
  END IF;

  IF NEW.slug_override IS NOT NULL AND btrim(NEW.slug_override) = '' THEN
    NEW.slug_override := NULL;
  END IF;

  IF NEW.publish_status = 'published'
     AND COALESCE(NEW.is_enabled, true)
     AND (NEW.slug_override IS NULL OR btrim(NEW.slug_override) = '') THEN
    NEW.slug_override := public.ensure_unique_intl_product_site_slug(
      NEW.product_id,
      public.build_intl_product_site_slug_candidate(NEW.product_id, NEW.display_name)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_intl_product_site_slug_override ON public.product_site_views;

CREATE TRIGGER trg_fill_intl_product_site_slug_override
BEFORE INSERT OR UPDATE OF slug_override, display_name, publish_status, is_enabled
ON public.product_site_views
FOR EACH ROW
EXECUTE FUNCTION public.trigger_fill_intl_product_site_slug_override();

DO $$
DECLARE
  rec record;
  v_candidate text;
BEGIN
  FOR rec IN
    SELECT product_id, display_name, slug_override
    FROM public.product_site_views
    WHERE site_code = 'intl'
    ORDER BY
      CASE
        WHEN publish_status = 'published' AND COALESCE(is_enabled, true) THEN 0
        ELSE 1
      END,
      published_at NULLS LAST,
      updated_at NULLS LAST,
      product_id
  LOOP
    v_candidate := COALESCE(
      NULLIF(btrim(rec.slug_override), ''),
      public.build_intl_product_site_slug_candidate(rec.product_id, rec.display_name)
    );

    UPDATE public.product_site_views
    SET slug_override = public.ensure_unique_intl_product_site_slug(rec.product_id, v_candidate)
    WHERE product_id = rec.product_id
      AND site_code = 'intl';
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.idx_product_site_views_intl_slug_override_unique;

CREATE UNIQUE INDEX idx_product_site_views_intl_slug_override_unique
  ON public.product_site_views(site_code, slug_override)
  WHERE site_code = 'intl'
    AND slug_override IS NOT NULL
    AND btrim(slug_override) <> '';

COMMIT;