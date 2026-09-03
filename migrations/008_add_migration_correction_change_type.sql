-- Migration 008: Adição atómica do valor 'migration_correction' ao CHECK constraint de project_page_revisions

BEGIN;

ALTER TABLE public.project_page_revisions 
DROP CONSTRAINT IF EXISTS project_page_revisions_change_type_check;

ALTER TABLE public.project_page_revisions 
ADD CONSTRAINT project_page_revisions_change_type_check 
CHECK (change_type IN (
  'initial_import', 
  'migration_correction', 
  'inspector_edit', 
  'ai_patch_apply', 
  'node_reorder', 
  'version_restore', 
  'publish'
));

COMMIT;
