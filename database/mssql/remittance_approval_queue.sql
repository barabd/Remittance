-- Approvals queue (A.1.4 #1–#2): maker–checker for cash vs account-pay remittances.
-- JPA: com.frms.ops.remittance.RemittanceQueueItemEntity

IF OBJECT_ID(N'dbo.remittance_queue_item', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.remittance_queue_item (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_remittance_queue_item PRIMARY KEY,
    remittance_no NVARCHAR(64) NOT NULL,
    created_at NVARCHAR(32) NOT NULL,
    corridor NVARCHAR(128) NOT NULL,
    amount NVARCHAR(64) NOT NULL,
    maker NVARCHAR(128) NOT NULL,
    pay_type NVARCHAR(32) NOT NULL,
    exchange_house NVARCHAR(128) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    checker NVARCHAR(128) NULL,
    approved_at NVARCHAR(32) NULL,
    reject_reason NVARCHAR(512) NULL
  );
END
GO
