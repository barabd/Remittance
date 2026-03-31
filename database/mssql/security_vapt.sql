-- VAPT findings tracker — stores findings from quarterly assessment cycles.
-- Supports /tools/security-vapt findings tracker (live mode).

IF OBJECT_ID('security_vapt_finding', 'U') IS NULL
BEGIN
  CREATE TABLE security_vapt_finding (
    id              BIGINT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    reference_no    VARCHAR(32)     NOT NULL,
    area_no         INT             NULL,
    area_name       NVARCHAR(128)   NOT NULL,
    severity        VARCHAR(16)     NOT NULL,   -- CRITICAL|HIGH|MEDIUM|LOW|INFO
    description     NVARCHAR(1024)  NOT NULL,
    status          VARCHAR(32)     NOT NULL,   -- OPEN|IN_PROGRESS|REMEDIATED|RETESTED|RISK_ACCEPTED
    owner           NVARCHAR(128)   NULL,
    target_date     VARCHAR(16)     NULL,
    closed_date     VARCHAR(16)     NULL,
    ticket_id       NVARCHAR(64)    NULL,
    retest_notes    NVARCHAR(512)   NULL,
    vapt_quarter    VARCHAR(16)     NULL,
    created_at      DATETIME2 NOT NULL CONSTRAINT df_security_vapt_finding_created DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2 NOT NULL CONSTRAINT df_security_vapt_finding_updated DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('security_vapt_finding', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('security_vapt_finding')
      AND name = 'ix_security_vapt_finding_severity_status'
  )
BEGIN
  CREATE INDEX ix_security_vapt_finding_severity_status
    ON security_vapt_finding(severity, status);
END
GO

IF OBJECT_ID('security_vapt_finding', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('security_vapt_finding')
      AND name = 'ix_security_vapt_finding_created'
  )
BEGIN
  CREATE INDEX ix_security_vapt_finding_created
    ON security_vapt_finding(created_at DESC);
END
GO

IF OBJECT_ID('security_vapt_finding', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('security_vapt_finding')
      AND name = 'uq_security_vapt_finding_reference_no'
  )
BEGIN
  ALTER TABLE security_vapt_finding
    ADD CONSTRAINT uq_security_vapt_finding_reference_no UNIQUE (reference_no);
END
GO

IF OBJECT_ID('security_vapt_finding', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('security_vapt_finding')
      AND name = 'ck_security_vapt_finding_severity'
  )
BEGIN
  ALTER TABLE security_vapt_finding WITH CHECK
    ADD CONSTRAINT ck_security_vapt_finding_severity
    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'));
END
GO

IF OBJECT_ID('security_vapt_finding', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('security_vapt_finding')
      AND name = 'ck_security_vapt_finding_status'
  )
BEGIN
  ALTER TABLE security_vapt_finding WITH CHECK
    ADD CONSTRAINT ck_security_vapt_finding_status
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'REMEDIATED', 'RETESTED', 'RISK_ACCEPTED'));
END
GO

