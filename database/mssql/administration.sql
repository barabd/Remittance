-- Administration module

CREATE TABLE frms_admin_branch (
    id VARCHAR(50) PRIMARY KEY,
    branch_code VARCHAR(50) NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    district VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    maker VARCHAR(50) NOT NULL,
    checker VARCHAR(50),
    created_at VARCHAR(50) NOT NULL
);

CREATE TABLE frms_admin_privileged_audit (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL,
    at_utc VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    actor_user_id VARCHAR(100) NOT NULL,
    target_user_id VARCHAR(100),
    environment VARCHAR(50),
    resource_ref NVARCHAR(MAX),
    ip VARCHAR(50) NOT NULL,
    details NVARCHAR(MAX) NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    how VARCHAR(50),
    client_device NVARCHAR(MAX),
    previous_entry_hash NVARCHAR(MAX),
    entry_hash NVARCHAR(MAX)
);
