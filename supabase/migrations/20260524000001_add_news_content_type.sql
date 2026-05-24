BEGIN;

ALTER TABLE public.content_records
  DROP CONSTRAINT IF EXISTS content_records_type_chk;

ALTER TABLE public.content_records
  ADD CONSTRAINT content_records_type_chk CHECK (
    content_type IN (
      'specialty_hub',
      'procedure',
      'case',
      'solution',
      'faq_hub',
      'glossary_term',
      'compare_page',
      'resource',
      'news'
    )
  );

COMMIT;