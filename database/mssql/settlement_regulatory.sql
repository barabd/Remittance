-- Settlement analytics (#31) + regulatory packages (#32) — aligns with com.frms.ops.settlementreg.* JPA entities.

IF OBJECT_ID(N'dbo.settlement_week_stat', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.settlement_week_stat (
    id VARCHAR(32) NOT NULL CONSTRAINT pk_settlement_week_stat PRIMARY KEY,
    day_label NVARCHAR(16) NOT NULL,
    gross_in_bdt BIGINT NOT NULL,
    net_settlement_bdt BIGINT NOT NULL,
    bilateral_adjustments BIGINT NOT NULL,
    sort_order INT NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.settlement_bilateral_position', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.settlement_bilateral_position (
    id VARCHAR(32) NOT NULL CONSTRAINT pk_settlement_bilateral PRIMARY KEY,
    counterparty NVARCHAR(256) NOT NULL,
    corridor NVARCHAR(128) NOT NULL,
    net_position_bdt BIGINT NOT NULL,
    as_of NVARCHAR(32) NOT NULL,
    multilateral_bucket NVARCHAR(64) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.regulatory_package', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.regulatory_package (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_regulatory_package PRIMARY KEY,
    kind NVARCHAR(64) NOT NULL,
    title NVARCHAR(512) NOT NULL,
    period NVARCHAR(64) NOT NULL,
    summary NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    destination NVARCHAR(512) NOT NULL,
    created_at NVARCHAR(32) NOT NULL
  );
END
GO
