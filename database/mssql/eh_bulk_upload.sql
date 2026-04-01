-- Exchange House Bulk Upload

CREATE TABLE frms_eh_bulk_batch (
    id VARCHAR(50) PRIMARY KEY,
    batch_status VARCHAR(50) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    exchange_house VARCHAR(100) NOT NULL,
    row_count INT NOT NULL
);

CREATE TABLE frms_eh_bulk_row (
    id VARCHAR(80) PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    row_no INT NOT NULL,
    remittance_no VARCHAR(100) NOT NULL,
    remitter VARCHAR(200) NOT NULL,
    beneficiary VARCHAR(200) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payout_channel VARCHAR(50) NOT NULL,
    payout_to VARCHAR(100) NOT NULL,
    exchange_house VARCHAR(100) NOT NULL,
    photo_id_type VARCHAR(50),
    photo_id_ref VARCHAR(100),
    errors NVARCHAR(MAX),
    incentive_bdt DECIMAL(18,2) NOT NULL,
    incentive_rule VARCHAR(100)
);

ALTER TABLE frms_eh_bulk_row
ADD CONSTRAINT fk_eh_bulk_row_batch
FOREIGN KEY (batch_id) REFERENCES frms_eh_bulk_batch(id);

CREATE INDEX idx_eh_bulk_batch_created_at ON frms_eh_bulk_batch(created_at);
CREATE INDEX idx_eh_bulk_batch_status ON frms_eh_bulk_batch(batch_status);
CREATE INDEX idx_eh_bulk_row_batch_id ON frms_eh_bulk_row(batch_id);
CREATE INDEX idx_eh_bulk_row_remittance_no ON frms_eh_bulk_row(remittance_no);
