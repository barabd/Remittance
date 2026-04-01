-- Permissions & Limits (A.1.4) 

CREATE TABLE frms_ho_role_policy (
    role VARCHAR(50) PRIMARY KEY,
    maker_max_txn_bdt BIGINT NOT NULL,
    checker_req_bdt BIGINT NOT NULL
);

CREATE TABLE frms_ho_branch_perm (
    branch_code VARCHAR(50) PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    can_initiate_block BIT NOT NULL DEFAULT 0
);

CREATE TABLE frms_ho_eh_block (
    agent_code VARCHAR(50) PRIMARY KEY,
    blocked BIT NOT NULL DEFAULT 0
);

-- Create indexes for permission lookups
CREATE INDEX idx_ho_role_policy ON frms_ho_role_policy(role);
CREATE INDEX idx_ho_branch_perm ON frms_ho_branch_perm(branch_code);
CREATE INDEX idx_ho_eh_block ON frms_ho_eh_block(agent_code);
