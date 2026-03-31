-- Distribution / Disbursement worklist (#36 channels, #37 branch vs sub-branch) + audit trail (demo).
-- JPA: com.frms.ops.disbursement.DisbursementItemEntity, DisbursementAuditEntity

IF OBJECT_ID(N'dbo.disbursement_audit', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.disbursement_audit (
    id BIGINT NOT NULL IDENTITY(1, 1) CONSTRAINT pk_disbursement_audit PRIMARY KEY,
    disbursement_id VARCHAR(64) NOT NULL,
    at_ts NVARCHAR(32) NOT NULL,
    actor NVARCHAR(128) NOT NULL,
    action NVARCHAR(256) NOT NULL,
    details NVARCHAR(512) NULL
  );
  CREATE INDEX ix_disbursement_audit_disbursement_id ON dbo.disbursement_audit (disbursement_id);
END
GO

IF OBJECT_ID(N'dbo.disbursement_item', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.disbursement_item (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_disbursement_item PRIMARY KEY,
    remittance_no NVARCHAR(64) NOT NULL,
    created_at NVARCHAR(32) NOT NULL,
    corridor NVARCHAR(128) NOT NULL,
    channel NVARCHAR(16) NOT NULL,
    payout_to NVARCHAR(256) NOT NULL,
    payout_ref NVARCHAR(64) NULL,
    beneficiary NVARCHAR(256) NOT NULL,
    amount_bdt NVARCHAR(64) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    checker NVARCHAR(128) NULL,
    status NVARCHAR(32) NOT NULL,
    originating_unit NVARCHAR(32) NOT NULL
  );
END
GO
