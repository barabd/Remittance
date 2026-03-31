-- Masters + AML — aligns with src/integrations/masters + aml and server/frms-ops-api JPA entities.

IF OBJECT_ID(N'dbo.masters_beneficiary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_beneficiary (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_masters_beneficiary PRIMARY KEY,
    full_name NVARCHAR(256) NOT NULL,
    phone NVARCHAR(64) NOT NULL,
    id_document_ref NVARCHAR(128) NOT NULL,
    bank_name NVARCHAR(256) NOT NULL,
    bank_account_masked NVARCHAR(128) NOT NULL,
    branch NVARCHAR(128) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    checker NVARCHAR(128) NULL,
    created_at NVARCHAR(32) NOT NULL,
    notes NVARCHAR(MAX) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.masters_beneficiary_audit', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_beneficiary_audit (
    id BIGINT NOT NULL IDENTITY(1, 1) CONSTRAINT pk_masters_beneficiary_audit PRIMARY KEY,
    beneficiary_id VARCHAR(64) NOT NULL,
    at_ts NVARCHAR(32) NOT NULL,
    actor NVARCHAR(128) NOT NULL,
    action NVARCHAR(256) NOT NULL,
    details NVARCHAR(512) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.masters_beneficiary_audit', N'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.masters_beneficiary_audit')
      AND name = N'ix_masters_beneficiary_audit_bid'
  )
BEGIN
  CREATE INDEX ix_masters_beneficiary_audit_bid
    ON dbo.masters_beneficiary_audit (beneficiary_id);
END
GO

IF OBJECT_ID(N'dbo.masters_agent', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_agent (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_masters_agent PRIMARY KEY,
    code NVARCHAR(64) NOT NULL,
    name NVARCHAR(256) NOT NULL,
    agent_type NVARCHAR(64) NOT NULL,
    country NVARCHAR(8) NOT NULL,
    contact_phone NVARCHAR(64) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    checker NVARCHAR(128) NULL,
    created_at NVARCHAR(32) NOT NULL,
    notes NVARCHAR(MAX) NULL
  );
END
GO

-- A.1.4 #9 — exchange houses / correspondent agents onboarding audit (maker-checker).
IF OBJECT_ID(N'dbo.masters_agent_audit', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_agent_audit (
    id BIGINT NOT NULL IDENTITY(1, 1) CONSTRAINT pk_masters_agent_audit PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    at_ts NVARCHAR(32) NOT NULL,
    actor NVARCHAR(128) NOT NULL,
    action NVARCHAR(256) NOT NULL,
    details NVARCHAR(512) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.masters_agent_audit', N'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.masters_agent_audit')
      AND name = N'ix_masters_agent_audit_aid'
  )
BEGIN
  CREATE INDEX ix_masters_agent_audit_aid
    ON dbo.masters_agent_audit (agent_id);
END
GO

IF OBJECT_ID(N'dbo.masters_cover_fund', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_cover_fund (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_masters_cover_fund PRIMARY KEY,
    fund_code NVARCHAR(64) NOT NULL,
    partner_name NVARCHAR(256) NOT NULL,
    currency NVARCHAR(8) NOT NULL,
    balance_amount DECIMAL(18, 2) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    checker NVARCHAR(128) NULL,
    updated_at NVARCHAR(32) NOT NULL,
    notes NVARCHAR(MAX) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.masters_cover_fund_audit', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.masters_cover_fund_audit (
    id BIGINT NOT NULL IDENTITY(1, 1) CONSTRAINT pk_masters_cover_fund_audit PRIMARY KEY,
    cover_fund_id VARCHAR(64) NOT NULL,
    at_ts NVARCHAR(32) NOT NULL,
    actor NVARCHAR(128) NOT NULL,
    action NVARCHAR(256) NOT NULL,
    details NVARCHAR(512) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.masters_cover_fund_audit', N'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.masters_cover_fund_audit')
      AND name = N'ix_masters_cover_fund_audit_id'
  )
BEGIN
  CREATE INDEX ix_masters_cover_fund_audit_id
    ON dbo.masters_cover_fund_audit (cover_fund_id);
END
GO

IF OBJECT_ID(N'dbo.compliance_aml_alert', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.compliance_aml_alert (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_compliance_aml_alert PRIMARY KEY,
    remittance_no NVARCHAR(64) NOT NULL,
    screened_at NVARCHAR(32) NOT NULL,
    match_type NVARCHAR(16) NOT NULL,
    list_name NVARCHAR(32) NOT NULL,
    score INT NOT NULL,
    status NVARCHAR(32) NOT NULL,
    subject_hint NVARCHAR(512) NULL
  );
END
GO
