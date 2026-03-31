-- Audit and Monitoring

CREATE TABLE frms_audit_user_activity (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL,
    at_utc VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    actor_user_id VARCHAR(100),
    outcome VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_ref NVARCHAR(MAX),
    ip VARCHAR(50) NOT NULL,
    details NVARCHAR(MAX) NOT NULL,
    how VARCHAR(50),
    client_device NVARCHAR(MAX),
    previous_entry_hash NVARCHAR(MAX),
    entry_hash NVARCHAR(MAX)
);
