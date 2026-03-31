CREATE TABLE frms_integration_connector (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    region VARCHAR(50) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_sync VARCHAR(50),
    notes NVARCHAR(MAX)
);

CREATE TABLE frms_integration_webhook_log (
    id VARCHAR(50) PRIMARY KEY,
    connector_id VARCHAR(50) NOT NULL,
    recorded_at VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    CONSTRAINT fk_webhook_connector FOREIGN KEY (connector_id) REFERENCES frms_integration_connector(id)
);

-- Seed defaults
INSERT INTO frms_integration_connector (id, category, name, region, protocol, status, last_sync, notes) VALUES
('nec-uk', 'exchange_api', 'NEC Money Transfer Limited — UK', 'UK', 'REST Open API', 'Sandbox', '2026-03-26 08:12', 'Quote / send confirm webhooks (demo).'),
('wse-kw', 'exchange_api', 'Wall Street Exchange Kuwait', 'KW', 'REST Open API', 'Connected (demo)', '2026-03-26 08:44', 'Batch settlement file + status API (demo).'),
('rajhi', 'exchange_api', 'Al Rajhi Banking & Investment Corp', 'SA', 'ISO 20022', 'Sandbox', '2026-03-25 18:20', 'pacs.008 style messages — stub parser (demo).'),
('cbs-core', 'domestic_rail', 'Core Banking System (CBS)', 'BD', 'Core SDK (demo)', 'Connected (demo)', '2026-03-26 08:55', 'GL / account posting façade (demo).'),
('bkash', 'domestic_rail', 'bKash', 'BD', 'REST Open API', 'Connected (demo)', '2026-03-26 08:50', 'Disbursement status callbacks (demo).'),
('nagad', 'domestic_rail', 'Nagad', 'BD', 'REST Open API', 'Sandbox', '2026-03-25 22:01', 'Wallet payout simulation (demo).'),
('small-world', 'exchange_api', 'Small World', 'Global', 'REST Open API', 'Sandbox', '2026-03-24 15:30', 'Corridor availability pull (demo).'),
('continental-ria', 'exchange_api', 'Continental Ex Solutions (RIA)', 'Multi', 'File / SFTP', 'Connected (demo)', '2026-03-26 07:00', 'Inbound RIA manifest files (demo).'),
('mastercard-ts', 'payment_network', 'Mastercard Transaction Services (US) LLC', 'US', 'ISO 20022', 'Sandbox', '2026-03-23 11:45', 'Cross-border card-linked payout stub (demo).'),
('swift-demo', 'payment_network', 'SWIFT / gpi (demo adapter)', 'Global', 'ISO 20022', 'Paused', '2026-03-20 09:00', '#40 — inward/outward message bridge (non-functional demo).'),
('beftn-gw', 'payment_network', 'BEFTN gateway', 'BD', 'File / SFTP', 'Connected (demo)', '2026-03-26 08:58', '#36 — batch debit files (demo).'),
('rtgs-bd', 'payment_network', 'RTGS (Bangladesh)', 'BD', 'ISO 20022', 'Connected (demo)', '2026-03-26 08:59', 'High-value trace references (demo).'),
('npsb-switchDemo', 'payment_network', 'NPSB switch (demo)', 'BD', 'Webhooks', 'Sandbox', '2026-03-25 16:10', 'Instant retail rail simulation.');
