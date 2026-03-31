-- Finance & GL (Finance General Ledger voucher worklist)
-- Supports maker-checker approval, posting, VAT tracking.

IF OBJECT_ID('finance_gl_voucher', 'U') IS NULL
BEGIN
  CREATE TABLE finance_gl_voucher (
    id                     VARCHAR(64) PRIMARY KEY,
    voucher_no             VARCHAR(64) NOT NULL UNIQUE,
    voucher_date           VARCHAR(16) NOT NULL,  -- yyyy-MM-dd
    type                   VARCHAR(16) NOT NULL,  -- Cash | Bank | Journal | Petty
    narration              VARCHAR(512) NOT NULL,
    debit                  FLOAT NOT NULL DEFAULT 0,
    credit                 FLOAT NOT NULL DEFAULT 0,
    vat_amount             FLOAT NOT NULL DEFAULT 0,  -- VAT / withholding on fees
    branch                 VARCHAR(128) NOT NULL,
    maker                  VARCHAR(128) NOT NULL,
    checker                VARCHAR(128) NULL,
    [status]               VARCHAR(32) NOT NULL DEFAULT 'Draft',
      -- Draft | Pending Approval | Approved | Posted | Rejected | On Hold
    created_at             DATETIME NOT NULL DEFAULT GETUTCDATE(),
    updated_at             DATETIME NOT NULL DEFAULT GETUTCDATE()
  );

  CREATE INDEX idx_finance_gl_voucher_status ON finance_gl_voucher([status]);
  CREATE INDEX idx_finance_gl_voucher_voucher_date ON finance_gl_voucher(voucher_date);
  CREATE INDEX idx_finance_gl_voucher_maker ON finance_gl_voucher(maker);
  CREATE INDEX idx_finance_gl_voucher_branch ON finance_gl_voucher(branch);
  CREATE INDEX idx_finance_gl_voucher_type ON finance_gl_voucher([type]);
END
GO

IF OBJECT_ID('finance_gl_voucher_audit', 'U') IS NULL
BEGIN
  CREATE TABLE finance_gl_voucher_audit (
    id                     BIGINT IDENTITY(1,1) PRIMARY KEY,
    voucher_id             VARCHAR(64) NOT NULL,
    at_ts                  VARCHAR(32) NOT NULL,
    actor                  VARCHAR(128) NOT NULL,
    action                 VARCHAR(256) NOT NULL,
    details                VARCHAR(512) NULL,
    CONSTRAINT fk_finance_gl_voucher_audit_voucher
      FOREIGN KEY (voucher_id) REFERENCES finance_gl_voucher(id)
  );

  CREATE INDEX idx_finance_gl_voucher_audit_voucher_id
    ON finance_gl_voucher_audit(voucher_id, id);
END
GO
