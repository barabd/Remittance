-- Server-side export artifacts (PDF/Excel/CSV)
-- Used by: com.frms.ops.exports.ExportController

IF OBJECT_ID('frms_export_artifact', 'U') IS NULL
BEGIN
  CREATE TABLE frms_export_artifact (
    id                VARCHAR(64)    NOT NULL PRIMARY KEY,
    export_format     VARCHAR(16)    NOT NULL,
    title             VARCHAR(256)   NOT NULL,
    file_name         VARCHAR(256)   NOT NULL,
    mime_type         VARCHAR(128)   NOT NULL,
    row_count         INT            NOT NULL,
    generated_by      VARCHAR(128)   NULL,
    status            VARCHAR(32)    NOT NULL,
    created_at        DATETIME2      NOT NULL CONSTRAINT df_frms_export_artifact_created DEFAULT SYSUTCDATETIME(),
    payload_hash      VARCHAR(128)   NULL,
    file_content      VARBINARY(MAX) NOT NULL
  );
END
GO

IF OBJECT_ID('frms_export_artifact', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('frms_export_artifact')
      AND name = 'ck_frms_export_artifact_format'
  )
BEGIN
  ALTER TABLE frms_export_artifact WITH CHECK
    ADD CONSTRAINT ck_frms_export_artifact_format
    CHECK (export_format IN ('pdf', 'xlsx', 'csv'));
END
GO

IF OBJECT_ID('frms_export_artifact', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('frms_export_artifact')
      AND name = 'ck_frms_export_artifact_status'
  )
BEGIN
  ALTER TABLE frms_export_artifact WITH CHECK
    ADD CONSTRAINT ck_frms_export_artifact_status
    CHECK (status IN ('Generated', 'Failed'));
END
GO

IF OBJECT_ID('frms_export_artifact', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('frms_export_artifact')
      AND name = 'ix_frms_export_artifact_created_at'
  )
BEGIN
  CREATE INDEX ix_frms_export_artifact_created_at
    ON frms_export_artifact(created_at DESC);
END
GO

IF OBJECT_ID('frms_export_artifact', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('frms_export_artifact')
      AND name = 'ix_frms_export_artifact_format_created'
  )
BEGIN
  CREATE INDEX ix_frms_export_artifact_format_created
    ON frms_export_artifact(export_format, created_at DESC);
END
GO
