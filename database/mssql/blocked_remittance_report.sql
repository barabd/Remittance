-- A.1.3 — Block remittance reports (stop-payment register). UI: /exchange-house/blocked-reports
-- Synced when remittance_record.status becomes Stopped; removed on release or when status leaves Stopped.

IF OBJECT_ID(N'dbo.eh_blocked_remittance', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.eh_blocked_remittance (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_eh_blocked_remittance PRIMARY KEY,
    remittance_record_id VARCHAR(64) NULL,
    remittance_no NVARCHAR(64) NOT NULL,
    remitter NVARCHAR(256) NOT NULL,
    beneficiary NVARCHAR(256) NOT NULL,
    corridor NVARCHAR(128) NOT NULL,
    amount NVARCHAR(64) NOT NULL,
    blocked_at NVARCHAR(32) NOT NULL,
    branch NVARCHAR(128) NULL,
    note NVARCHAR(MAX) NULL,
    CONSTRAINT uq_eh_blocked_remittance_no UNIQUE (remittance_no)
  );
  CREATE INDEX ix_eh_blocked_remittance_blocked_at ON dbo.eh_blocked_remittance (blocked_at DESC);
END
GO
