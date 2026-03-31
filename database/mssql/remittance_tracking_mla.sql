-- Remittance Search & Tracking + server MLA (photo ID, limits, patterns, double AML blocks).

IF OBJECT_ID(N'dbo.frms_mla_settings', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.frms_mla_settings (
    id VARCHAR(16) NOT NULL CONSTRAINT pk_frms_mla_settings PRIMARY KEY,
    screening_mode NVARCHAR(32) NOT NULL CONSTRAINT df_frms_mla_screening_mode DEFAULT 'keywords',
    require_photo_id BIT NOT NULL,
    max_remittances_per_remitter_per_day INT NOT NULL,
    max_bdt_total_per_remitter_per_day BIGINT NOT NULL,
    pattern_one_to_many_min INT NOT NULL,
    pattern_many_to_one_min INT NOT NULL,
    block_approval_on_business_term BIT NOT NULL,
    block_approval_on_pattern BIT NOT NULL,
    block_approval_on_primary_aml_hit BIT NOT NULL,
    block_approval_on_opac_dsri_hit BIT NOT NULL,
    auto_screen_on_search_import BIT NOT NULL,
    country_keywords_json NVARCHAR(MAX) NOT NULL
  );
END
GO

IF COL_LENGTH('dbo.frms_mla_settings', 'screening_mode') IS NULL
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD screening_mode NVARCHAR(32) NOT NULL
      CONSTRAINT df_frms_mla_screening_mode DEFAULT 'keywords';
END
GO

-- CHECK constraints — non-negative numeric controls (0 = off / unlimited).
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.frms_mla_settings')
    AND name = N'ck_frms_mla_max_remittances_nn'
)
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD CONSTRAINT ck_frms_mla_max_remittances_nn
      CHECK (max_remittances_per_remitter_per_day >= 0);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.frms_mla_settings')
    AND name = N'ck_frms_mla_max_bdt_nn'
)
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD CONSTRAINT ck_frms_mla_max_bdt_nn
      CHECK (max_bdt_total_per_remitter_per_day >= 0);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.frms_mla_settings')
    AND name = N'ck_frms_mla_pattern_o2m_nn'
)
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD CONSTRAINT ck_frms_mla_pattern_o2m_nn
      CHECK (pattern_one_to_many_min >= 0);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.frms_mla_settings')
    AND name = N'ck_frms_mla_pattern_m2o_nn'
)
BEGIN
  ALTER TABLE dbo.frms_mla_settings
    ADD CONSTRAINT ck_frms_mla_pattern_m2o_nn
      CHECK (pattern_many_to_one_min >= 0);
END
GO

IF OBJECT_ID(N'dbo.remittance_record', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.remittance_record (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_remittance_record PRIMARY KEY,
    remittance_no NVARCHAR(64) NOT NULL,
    exchange_house NVARCHAR(128) NOT NULL,
    created_at NVARCHAR(32) NOT NULL,
    corridor NVARCHAR(128) NOT NULL,
    amount NVARCHAR(64) NOT NULL,
    remitter NVARCHAR(256) NOT NULL,
    beneficiary NVARCHAR(256) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    checker NVARCHAR(128) NULL,
    status NVARCHAR(32) NOT NULL,
    channel NVARCHAR(16) NOT NULL,
    photo_id_type NVARCHAR(64) NULL,
    photo_id_ref NVARCHAR(128) NULL
  );
END
GO

-- A.1.3 Exchange House single-entry: server-backed IDs (peek / reserve / submit).
IF OBJECT_ID(N'dbo.frms_eh_entry_sequence', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.frms_eh_entry_sequence (
    id VARCHAR(16) NOT NULL CONSTRAINT pk_frms_eh_entry_sequence PRIMARY KEY,
    last_seq BIGINT NOT NULL CONSTRAINT df_frms_eh_entry_last_seq DEFAULT 0,
    held_seq BIGINT NULL
  );
END
GO

IF COL_LENGTH('dbo.remittance_record', 'remitter_party_id') IS NULL
BEGIN
  ALTER TABLE dbo.remittance_record ADD remitter_party_id NVARCHAR(64) NULL;
END
GO

IF COL_LENGTH('dbo.remittance_record', 'beneficiary_party_id') IS NULL
BEGIN
  ALTER TABLE dbo.remittance_record ADD beneficiary_party_id NVARCHAR(64) NULL;
END
GO

IF COL_LENGTH('dbo.remittance_record', 'money_receipt_no') IS NULL
BEGIN
  ALTER TABLE dbo.remittance_record ADD money_receipt_no NVARCHAR(64) NULL;
END
GO

IF COL_LENGTH('dbo.frms_eh_entry_sequence', 'held_seq') IS NULL
  AND OBJECT_ID(N'dbo.frms_eh_entry_sequence', N'U') IS NOT NULL
BEGIN
  ALTER TABLE dbo.frms_eh_entry_sequence ADD held_seq BIGINT NULL;
END
GO

-- Note: new installs get held_seq from CREATE above; ALTER is for existing DBs created before held_seq existed.
