-- Finance Reports request queue (maker-checker + export audit)
-- Used by: com.frms.ops.reports.ReportRequestController

IF OBJECT_ID('frms_report_request', 'U') IS NULL
BEGIN
  CREATE TABLE frms_report_request (
    id                     VARCHAR(64)   NOT NULL PRIMARY KEY,
    report_name            VARCHAR(256)  NOT NULL,
    generated_at           VARCHAR(32)   NOT NULL,
    period_from            VARCHAR(16)   NOT NULL,
    period_to              VARCHAR(16)   NOT NULL,
    branch_scope           VARCHAR(256)  NOT NULL,
    row_count              INT           NOT NULL,
    maker                  VARCHAR(128)  NOT NULL,
    checker                VARCHAR(128)  NULL,
    [status]               VARCHAR(32)   NOT NULL,
    created_at             DATETIME2     NOT NULL CONSTRAINT df_frms_report_request_created DEFAULT SYSUTCDATETIME(),
    updated_at             DATETIME2     NOT NULL CONSTRAINT df_frms_report_request_updated DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('frms_report_request', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('frms_report_request')
      AND name = 'ck_frms_report_request_status'
  )
BEGIN
  ALTER TABLE frms_report_request WITH CHECK
    ADD CONSTRAINT ck_frms_report_request_status
    CHECK ([status] IN ('Draft', 'Generated', 'Pending Approval', 'Approved', 'Rejected'));
END
GO

IF OBJECT_ID('frms_report_request', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('frms_report_request')
      AND name = 'ix_frms_report_request_generated_at'
  )
BEGIN
  CREATE INDEX ix_frms_report_request_generated_at
    ON frms_report_request(generated_at DESC);
END
GO

IF OBJECT_ID('frms_report_request', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('frms_report_request')
      AND name = 'ix_frms_report_request_status'
  )
BEGIN
  CREATE INDEX ix_frms_report_request_status
    ON frms_report_request([status]);
END
GO

IF OBJECT_ID('frms_report_request_audit', 'U') IS NULL
BEGIN
  CREATE TABLE frms_report_request_audit (
    id                     BIGINT        IDENTITY(1,1) PRIMARY KEY,
    report_id              VARCHAR(64)   NOT NULL,
    at_ts                  VARCHAR(32)   NOT NULL,
    actor                  VARCHAR(128)  NOT NULL,
    action                 VARCHAR(256)  NOT NULL,
    details                VARCHAR(512)  NULL,
    CONSTRAINT fk_frms_report_request_audit_report
      FOREIGN KEY (report_id) REFERENCES frms_report_request(id)
  );
END
GO

IF OBJECT_ID('frms_report_request_audit', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('frms_report_request_audit')
      AND name = 'ix_frms_report_request_audit_report_id'
  )
BEGIN
  CREATE INDEX ix_frms_report_request_audit_report_id
    ON frms_report_request_audit(report_id, id);
END
GO

IF NOT EXISTS (SELECT 1 FROM frms_report_request WHERE id = 'RPT-2026-000001')
BEGIN
  INSERT INTO frms_report_request (
    id, report_name, generated_at, period_from, period_to, branch_scope,
    row_count, maker, checker, [status]
  ) VALUES (
    'RPT-2026-000001',
    'Day Wise Total Summary',
    '2026-03-27 09:45',
    '2026-03-01',
    '2026-03-27',
    'All branches',
    2,
    'Finance-01',
    'HO-Admin',
    'Approved'
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM frms_report_request_audit
  WHERE report_id = 'RPT-2026-000001' AND action = 'Generated report'
)
BEGIN
  INSERT INTO frms_report_request_audit (report_id, at_ts, actor, action, details)
  VALUES
    ('RPT-2026-000001', '2026-03-27 09:45', 'Finance-01', 'Generated report', 'Day Wise Total Summary · 2026-03-01 → 2026-03-27'),
    ('RPT-2026-000001', '2026-03-27 09:45', 'System', 'Queued for maker-checker approval', NULL),
    ('RPT-2026-000001', '2026-03-27 10:05', 'HO-Admin', 'Approved', NULL);
END
GO
