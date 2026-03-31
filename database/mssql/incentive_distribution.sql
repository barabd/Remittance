-- Incentive management & distribution workbench (#33)
-- Separate accrual/payout staging for exchange-partner incentive batches.

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NULL
BEGIN
  CREATE TABLE finance_incentive_distribution_batch (
    id                     VARCHAR(64)   NOT NULL PRIMARY KEY,
    exchange_house         VARCHAR(128)  NOT NULL,
    period_ym              VARCHAR(16)   NOT NULL,  -- YYYY-MM
    total_incentive_bdt    FLOAT         NOT NULL DEFAULT 0,
    remittance_count       INT           NOT NULL DEFAULT 0,
    [status]               VARCHAR(32)   NOT NULL DEFAULT 'Accrued',
      -- Accrued | Approved for payout | Paid | On hold
    [channel]              VARCHAR(32)   NOT NULL DEFAULT 'Nostro adjustment',
      -- Nostro adjustment | Partner invoice | GL sweep
    created_at             DATETIME2     NOT NULL CONSTRAINT df_fin_incentive_batch_created DEFAULT SYSUTCDATETIME(),
    updated_at             DATETIME2     NOT NULL CONSTRAINT df_fin_incentive_batch_updated DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'uq_fin_incentive_batch_exchange_period'
  )
BEGIN
  ALTER TABLE finance_incentive_distribution_batch
    ADD CONSTRAINT uq_fin_incentive_batch_exchange_period UNIQUE (exchange_house, period_ym);
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'ck_fin_incentive_batch_status'
  )
BEGIN
  ALTER TABLE finance_incentive_distribution_batch WITH CHECK
    ADD CONSTRAINT ck_fin_incentive_batch_status
    CHECK ([status] IN ('Accrued', 'Approved for payout', 'Paid', 'On hold'));
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'ck_fin_incentive_batch_channel'
  )
BEGIN
  ALTER TABLE finance_incentive_distribution_batch WITH CHECK
    ADD CONSTRAINT ck_fin_incentive_batch_channel
    CHECK ([channel] IN ('Nostro adjustment', 'Partner invoice', 'GL sweep'));
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'ck_fin_incentive_batch_period_ym'
  )
BEGIN
  ALTER TABLE finance_incentive_distribution_batch WITH CHECK
    ADD CONSTRAINT ck_fin_incentive_batch_period_ym
    CHECK (
      LEN(period_ym) = 7
      AND SUBSTRING(period_ym, 5, 1) = '-'
      AND TRY_CONVERT(INT, LEFT(period_ym, 4)) BETWEEN 1900 AND 2999
      AND TRY_CONVERT(INT, RIGHT(period_ym, 2)) BETWEEN 1 AND 12
    );
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'ix_fin_incentive_batch_status'
  )
BEGIN
  CREATE INDEX ix_fin_incentive_batch_status
    ON finance_incentive_distribution_batch([status]);
END
GO

IF OBJECT_ID('finance_incentive_distribution_batch', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('finance_incentive_distribution_batch')
      AND name = 'ix_fin_incentive_batch_updated'
  )
BEGIN
  CREATE INDEX ix_fin_incentive_batch_updated
    ON finance_incentive_distribution_batch(updated_at DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM finance_incentive_distribution_batch WHERE id = 'IDB-001')
BEGIN
  INSERT INTO finance_incentive_distribution_batch (
    id, exchange_house, period_ym, total_incentive_bdt, remittance_count, [status], [channel]
  ) VALUES (
    'IDB-001', 'EH-GULF-01', '2026-03', 128450.75, 1840, 'Accrued', 'Nostro adjustment'
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM finance_incentive_distribution_batch WHERE id = 'IDB-002')
BEGIN
  INSERT INTO finance_incentive_distribution_batch (
    id, exchange_house, period_ym, total_incentive_bdt, remittance_count, [status], [channel]
  ) VALUES (
    'IDB-002', 'EH-RUH-02', '2026-03', 82110.20, 960, 'Approved for payout', 'Partner invoice'
  );
END
GO
