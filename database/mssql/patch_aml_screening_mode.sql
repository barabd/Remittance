-- Production patch: add persisted screening mode for AML behavior.
-- Safe to run multiple times (idempotent).
-- Target database: frms_ops

IF DB_NAME() <> 'frms_ops'
BEGIN
  RAISERROR('Run this script in database frms_ops.', 16, 1);
  RETURN;
END
GO

IF OBJECT_ID(N'dbo.frms_mla_settings', N'U') IS NULL
BEGIN
  RAISERROR('Table dbo.frms_mla_settings is missing. Apply remittance_tracking_mla.sql first.', 16, 1);
  RETURN;
END
GO

IF COL_LENGTH('dbo.frms_mla_settings', 'screening_mode') IS NULL
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD screening_mode NVARCHAR(32) NOT NULL
      CONSTRAINT df_frms_mla_screening_mode DEFAULT 'keywords';
END
GO

-- Backfill null/blank/invalid values to supported mode set.
UPDATE dbo.frms_mla_settings
SET screening_mode = 'keywords'
WHERE screening_mode IS NULL
   OR LTRIM(RTRIM(screening_mode)) = ''
   OR LOWER(LTRIM(RTRIM(screening_mode))) NOT IN ('keywords', 'mock_vendor_api');
GO

-- Ensure singleton MLA row exists for API controllers expecting id='default'.
IF NOT EXISTS (SELECT 1 FROM dbo.frms_mla_settings WHERE id = 'default')
BEGIN
  INSERT INTO dbo.frms_mla_settings (
    id,
    screening_mode,
    require_photo_id,
    max_remittances_per_remitter_per_day,
    max_bdt_total_per_remitter_per_day,
    pattern_one_to_many_min,
    pattern_many_to_one_min,
    block_approval_on_business_term,
    block_approval_on_pattern,
    block_approval_on_primary_aml_hit,
    block_approval_on_opac_dsri_hit,
    auto_screen_on_search_import,
    country_keywords_json
  )
  VALUES (
    'default',
    'keywords',
    1,
    30,
    0,
    4,
    4,
    1,
    1,
    0,
    0,
    1,
    '{"BD":["hundi","hawala","illegal corridor","undocumented transfer"],"US":["unlicensed msb"]}'
  );
END
GO

SELECT
  id,
  screening_mode,
  require_photo_id,
  auto_screen_on_search_import
FROM dbo.frms_mla_settings
WHERE id = 'default';
GO
