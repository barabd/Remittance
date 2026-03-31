-- Corporate file mapping + incentive tiers (#24, #30)
-- Supports frontend route /tools/corporate-file-mapping and upload consumers.

IF OBJECT_ID('corporate_file_mapping_profile', 'U') IS NULL
BEGIN
  CREATE TABLE corporate_file_mapping_profile (
    id                           VARCHAR(64) PRIMARY KEY,
    name                         NVARCHAR(256) NOT NULL,
    search_field_headers_json    NVARCHAR(MAX) NOT NULL,
    bulk_field_headers_json      NVARCHAR(MAX) NOT NULL,
    updated_at                   VARCHAR(32) NOT NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM corporate_file_mapping_profile WHERE id = 'default')
BEGIN
  INSERT INTO corporate_file_mapping_profile (
    id,
    name,
    search_field_headers_json,
    bulk_field_headers_json,
    updated_at
  ) VALUES (
    'default',
    N'Standard FRMS',
    N'{}',
    N'{}',
    CONVERT(VARCHAR(16), GETDATE(), 120)
  );
END
GO

IF OBJECT_ID('corporate_file_mapping_defaults', 'U') IS NULL
BEGIN
  CREATE TABLE corporate_file_mapping_defaults (
    id                           INT NOT NULL PRIMARY KEY,
    default_search_profile_id    VARCHAR(64) NOT NULL,
    default_bulk_profile_id      VARCHAR(64) NOT NULL,
    updated_at                   VARCHAR(32) NOT NULL
  );
END
GO

IF OBJECT_ID('corporate_file_mapping_defaults', 'U') IS NOT NULL
  AND OBJECT_ID('corporate_file_mapping_profile', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'fk_corporate_mapping_defaults_search_profile'
      AND parent_object_id = OBJECT_ID('corporate_file_mapping_defaults')
  )
BEGIN
  ALTER TABLE corporate_file_mapping_defaults
    WITH CHECK ADD CONSTRAINT fk_corporate_mapping_defaults_search_profile
    FOREIGN KEY (default_search_profile_id)
    REFERENCES corporate_file_mapping_profile(id);
END
GO

IF OBJECT_ID('corporate_file_mapping_defaults', 'U') IS NOT NULL
  AND OBJECT_ID('corporate_file_mapping_profile', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'fk_corporate_mapping_defaults_bulk_profile'
      AND parent_object_id = OBJECT_ID('corporate_file_mapping_defaults')
  )
BEGIN
  ALTER TABLE corporate_file_mapping_defaults
    WITH CHECK ADD CONSTRAINT fk_corporate_mapping_defaults_bulk_profile
    FOREIGN KEY (default_bulk_profile_id)
    REFERENCES corporate_file_mapping_profile(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM corporate_file_mapping_defaults WHERE id = 1)
BEGIN
  INSERT INTO corporate_file_mapping_defaults (
    id,
    default_search_profile_id,
    default_bulk_profile_id,
    updated_at
  ) VALUES (
    1,
    'default',
    'default',
    CONVERT(VARCHAR(16), GETDATE(), 120)
  );
END
GO

IF OBJECT_ID('corporate_incentive_tier', 'U') IS NULL
BEGIN
  CREATE TABLE corporate_incentive_tier (
    id                   VARCHAR(64) PRIMARY KEY,
    label                NVARCHAR(256) NOT NULL,
    min_bdt_equivalent   FLOAT NOT NULL DEFAULT 0,
    max_bdt_equivalent   FLOAT NOT NULL DEFAULT 0,
    pct_of_principal     FLOAT NOT NULL DEFAULT 0,
    flat_bdt             FLOAT NOT NULL DEFAULT 0,
    updated_at           VARCHAR(32) NOT NULL
  );
END
GO

IF OBJECT_ID('corporate_incentive_tier', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('corporate_incentive_tier')
      AND name = 'ix_corporate_incentive_tier_min_max'
  )
BEGIN
  CREATE INDEX ix_corporate_incentive_tier_min_max
    ON corporate_incentive_tier(min_bdt_equivalent, max_bdt_equivalent);
END
GO
