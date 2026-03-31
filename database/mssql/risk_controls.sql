-- Compliance risk controls (#10): per-customer transaction + daily BDT caps.

IF OBJECT_ID(N'dbo.risk_control_profile', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.risk_control_profile (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_risk_control_profile PRIMARY KEY,
    customer_name NVARCHAR(256) NOT NULL,
    max_per_txn_bdt BIGINT NOT NULL,
    max_daily_total_bdt BIGINT NOT NULL,
    watch_level NVARCHAR(16) NOT NULL,
    updated_at NVARCHAR(32) NOT NULL
  );

  CREATE INDEX ix_risk_control_profile_customer_name
    ON dbo.risk_control_profile(customer_name);
END
GO

IF COL_LENGTH('dbo.risk_control_profile', 'customer_name_norm') IS NULL
BEGIN
  ALTER TABLE dbo.risk_control_profile
  ADD customer_name_norm AS UPPER(LTRIM(RTRIM(customer_name))) PERSISTED;
END
GO

IF EXISTS (
  SELECT customer_name_norm
  FROM dbo.risk_control_profile
  GROUP BY customer_name_norm
  HAVING COUNT(*) > 1
)
BEGIN
  THROW 50001, 'Duplicate customer names exist in risk_control_profile. Resolve duplicates before applying unique index.', 1;
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ux_risk_control_profile_customer_name_norm'
    AND object_id = OBJECT_ID('dbo.risk_control_profile')
)
BEGIN
  CREATE UNIQUE INDEX ux_risk_control_profile_customer_name_norm
    ON dbo.risk_control_profile(customer_name_norm);
END
GO

IF OBJECT_ID(N'dbo.ck_risk_control_profile_max_per_txn_pos', N'C') IS NULL
BEGIN
  ALTER TABLE dbo.risk_control_profile
    ADD CONSTRAINT ck_risk_control_profile_max_per_txn_pos
    CHECK (max_per_txn_bdt > 0);
END
GO

IF OBJECT_ID(N'dbo.ck_risk_control_profile_max_daily_pos', N'C') IS NULL
BEGIN
  ALTER TABLE dbo.risk_control_profile
    ADD CONSTRAINT ck_risk_control_profile_max_daily_pos
    CHECK (max_daily_total_bdt > 0);
END
GO

IF OBJECT_ID(N'dbo.ck_risk_control_profile_daily_ge_per_txn', N'C') IS NULL
BEGIN
  ALTER TABLE dbo.risk_control_profile
    ADD CONSTRAINT ck_risk_control_profile_daily_ge_per_txn
    CHECK (max_daily_total_bdt >= max_per_txn_bdt);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.risk_control_profile)
BEGIN
  INSERT INTO dbo.risk_control_profile
    (id, customer_name, max_per_txn_bdt, max_daily_total_bdt, watch_level, updated_at)
  VALUES
    ('RISK-1', 'Rahim Uddin', 500000, 1500000, 'Medium', '2026-03-26 09:00'),
    ('RISK-2', 'Karim Mia', 300000, 900000, 'High', '2026-03-26 09:00');
END
GO
