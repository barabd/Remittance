-- FRMS Operations hub (#17, #18, #15) — Microsoft SQL Server DDL
-- Create database first: CREATE DATABASE frms_ops; GO USE frms_ops;
-- Or rely on Hibernate ddl-auto=update in dev (frms-ops-api).
-- Frontend domain types + merge layer: src/integrations/operationsHub/types.ts + operationsHubRepository.ts

IF OBJECT_ID(N'dbo.ops_notification', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ops_notification (
    id VARCHAR(36) NOT NULL CONSTRAINT pk_ops_notification PRIMARY KEY,
    kind VARCHAR(32) NOT NULL,
    title NVARCHAR(500) NOT NULL,
    body NVARCHAR(MAX) NOT NULL,
    remittance_no NVARCHAR(256) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_ops_notification_created DEFAULT SYSUTCDATETIME(),
    read_flag BIT NOT NULL CONSTRAINT df_ops_notification_read DEFAULT 0
  );
  CREATE INDEX ix_ops_notification_created ON dbo.ops_notification (created_at DESC);
END
GO

IF OBJECT_ID(N'dbo.ops_email_outbox', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ops_email_outbox (
    id VARCHAR(36) NOT NULL CONSTRAINT pk_ops_email_outbox PRIMARY KEY,
    recipient NVARCHAR(512) NOT NULL,
    subject NVARCHAR(500) NOT NULL,
    body_preview NVARCHAR(MAX) NOT NULL,
    exchange_house NVARCHAR(256) NULL,
    report_ref NVARCHAR(128) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT df_ops_outbox_created DEFAULT SYSUTCDATETIME(),
    status VARCHAR(32) NOT NULL CONSTRAINT df_ops_outbox_status DEFAULT N'queued'
  );
  CREATE INDEX ix_ops_outbox_created ON dbo.ops_email_outbox (created_at DESC);
END
GO

IF OBJECT_ID(N'dbo.ops_feedback_log', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ops_feedback_log (
    id VARCHAR(36) NOT NULL CONSTRAINT pk_ops_feedback PRIMARY KEY,
    logged_at DATETIME2 NOT NULL CONSTRAINT df_ops_feedback_logged DEFAULT SYSUTCDATETIME(),
    source NVARCHAR(64) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    meta NVARCHAR(MAX) NULL
  );
  CREATE INDEX ix_ops_feedback_logged ON dbo.ops_feedback_log (logged_at DESC);
END
GO
