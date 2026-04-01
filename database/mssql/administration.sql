-- Administration module

CREATE TABLE frms_admin_branch (
    id VARCHAR(50) PRIMARY KEY,
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('HO', 'Branch', 'Sub-Branch', 'Agent')),
    district VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Pending Approval', 'On Hold', 'Deleted')),
    maker VARCHAR(50) NOT NULL,
    checker VARCHAR(50),
    created_at VARCHAR(50) NOT NULL DEFAULT CONVERT(VARCHAR(50), GETDATE(), 121)
);
CREATE INDEX idx_admin_branch_code ON frms_admin_branch(branch_code);
CREATE INDEX idx_admin_branch_status ON frms_admin_branch(status);


CREATE TABLE frms_admin_privileged_audit (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL DEFAULT CONVERT(VARCHAR(50), GETDATE(), 121),
    at_utc VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    actor_user_id VARCHAR(100) NOT NULL,
    target_user_id VARCHAR(100),
    environment VARCHAR(50),
    resource_ref NVARCHAR(MAX),
    ip VARCHAR(50) NOT NULL,
    details NVARCHAR(MAX) NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('Success', 'Failure', 'Denied', 'Error')),
    how VARCHAR(50),
    client_device NVARCHAR(MAX),
    previous_entry_hash NVARCHAR(MAX),
    entry_hash NVARCHAR(MAX)
);

CREATE INDEX idx_admin_audit_actor ON frms_admin_privileged_audit(actor_user_id, at);
CREATE INDEX idx_admin_audit_category ON frms_admin_privileged_audit(category, at);
