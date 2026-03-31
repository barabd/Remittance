-- Security utilities audit/event persistence (demo)
-- Supports /tools/security-utilities backend-linked Luhn operations.

IF OBJECT_ID('security_utility_event', 'U') IS NULL
BEGIN
  CREATE TABLE security_utility_event (
    id              BIGINT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    action          VARCHAR(64) NOT NULL,
    payload_masked  NVARCHAR(256) NOT NULL,
    result          VARCHAR(32) NOT NULL,
    details         NVARCHAR(512) NULL,
    created_at      DATETIME2 NOT NULL CONSTRAINT df_security_utility_event_created DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('security_utility_event', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('security_utility_event')
      AND name = 'ix_security_utility_event_created'
  )
BEGIN
  CREATE INDEX ix_security_utility_event_created
    ON security_utility_event(created_at DESC);
END
GO

IF OBJECT_ID('security_utility_event', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('security_utility_event')
      AND name = 'ix_security_utility_event_action'
  )
BEGIN
  CREATE INDEX ix_security_utility_event_action
    ON security_utility_event(action);
END
GO
