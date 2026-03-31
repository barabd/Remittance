-- BEFTN acknowledgment file processing (A.1.3)
-- Stores uploaded ACK files + parsed rows, then applies status updates to disbursement_item.

IF OBJECT_ID(N'dbo.beftn_ack_file', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.beftn_ack_file (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_beftn_ack_file PRIMARY KEY,
    file_name NVARCHAR(512) NOT NULL,
    uploaded_at NVARCHAR(32) NOT NULL,
    uploader NVARCHAR(128) NULL,
    row_count INT NOT NULL CONSTRAINT df_beftn_ack_file_row_count DEFAULT 0,
    status NVARCHAR(32) NOT NULL CONSTRAINT df_beftn_ack_file_status DEFAULT N'Parsed',
    applied_at NVARCHAR(32) NULL,
    summary_json NVARCHAR(MAX) NULL
  );
  CREATE INDEX ix_beftn_ack_file_uploaded_at ON dbo.beftn_ack_file (uploaded_at DESC);
END
GO

IF OBJECT_ID(N'dbo.beftn_ack_row', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.beftn_ack_row (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_beftn_ack_row PRIMARY KEY,
    ack_file_id VARCHAR(64) NOT NULL,
    line_no INT NOT NULL,
    batch_ref NVARCHAR(128) NULL,
    txn_ref NVARCHAR(128) NULL,
    remittance_no NVARCHAR(64) NULL,
    amount_bdt NVARCHAR(64) NULL,
    ack_status NVARCHAR(64) NULL,
    value_date NVARCHAR(32) NULL,
    raw_line NVARCHAR(MAX) NOT NULL,
    parse_status NVARCHAR(32) NOT NULL,
    parse_message NVARCHAR(512) NULL,
    matched_disbursement_id VARCHAR(64) NULL,
    CONSTRAINT fk_beftn_ack_row_file FOREIGN KEY (ack_file_id) REFERENCES dbo.beftn_ack_file (id) ON DELETE CASCADE
  );
  CREATE INDEX ix_beftn_ack_row_file ON dbo.beftn_ack_row (ack_file_id);
  CREATE INDEX ix_beftn_ack_row_txn_ref ON dbo.beftn_ack_row (txn_ref);
  CREATE INDEX ix_beftn_ack_row_remittance_no ON dbo.beftn_ack_row (remittance_no);
  CREATE INDEX ix_beftn_ack_row_parse_status ON dbo.beftn_ack_row (parse_status);
END
GO