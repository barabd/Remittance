-- Pricing — commission bands, FX ranges, bank FX rates
-- Supports range-wise & bank-wise pricing configurations.

IF OBJECT_ID('pricing_commission_band', 'U') IS NULL
BEGIN
  CREATE TABLE pricing_commission_band (
    id                     VARCHAR(64) PRIMARY KEY,
    label                  VARCHAR(128) NOT NULL,
    currency_pair          VARCHAR(16) NOT NULL,   -- e.g. USD/BDT
    commission_for         VARCHAR(32) NOT NULL,   -- Any | Cash | Deposit Slip | Credit/Debit Card
    min_amount             FLOAT NOT NULL DEFAULT 0,
    max_amount             FLOAT NOT NULL DEFAULT 0,
    commission_pct         FLOAT NOT NULL DEFAULT 0,
    flat_fee               FLOAT NOT NULL DEFAULT 0,
    updated_at             VARCHAR(32) NOT NULL    -- yyyy-MM-dd
  );

  CREATE INDEX idx_pricing_commission_band_currency_pair ON pricing_commission_band(currency_pair);
  CREATE INDEX idx_pricing_commission_band_commission_for ON pricing_commission_band(commission_for);
END
GO

IF OBJECT_ID('pricing_fx_range_band', 'U') IS NULL
BEGIN
  CREATE TABLE pricing_fx_range_band (
    id                     VARCHAR(64) PRIMARY KEY,
    label                  VARCHAR(128) NOT NULL,
    from_currency          VARCHAR(3) NOT NULL,    -- e.g. USD
    to_currency            VARCHAR(3) NOT NULL,    -- e.g. BDT
    min_amount_from        FLOAT NOT NULL DEFAULT 0,
    max_amount_from        FLOAT NOT NULL DEFAULT 0,
    rate                   FLOAT NOT NULL DEFAULT 0,
    updated_at             VARCHAR(32) NOT NULL    -- yyyy-MM-dd
  );

  CREATE INDEX idx_pricing_fx_range_band_pair ON pricing_fx_range_band(from_currency, to_currency);
END
GO

IF OBJECT_ID('pricing_bank_fx_rate', 'U') IS NULL
BEGIN
  CREATE TABLE pricing_bank_fx_rate (
    id                     VARCHAR(64) PRIMARY KEY,
    bank_code              VARCHAR(32) NOT NULL,
    bank_name              VARCHAR(128) NOT NULL,
    from_currency          VARCHAR(3) NOT NULL,    -- e.g. USD
    to_currency            VARCHAR(3) NOT NULL,    -- e.g. BDT
    rate                   FLOAT NOT NULL DEFAULT 0,
    commission_pct         FLOAT NOT NULL DEFAULT 0,
    updated_at             VARCHAR(32) NOT NULL    -- yyyy-MM-dd
  );

  CREATE INDEX idx_pricing_bank_fx_rate_bank_code ON pricing_bank_fx_rate(bank_code);
  CREATE INDEX idx_pricing_bank_fx_rate_pair ON pricing_bank_fx_rate(from_currency, to_currency);
END
GO
