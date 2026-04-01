-- User Rights / Security Directory module 

CREATE TABLE frms_sec_directory_user (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    realm VARCHAR(50) NOT NULL,
    eh_branch_unit VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'On Hold')),
    maker VARCHAR(50) NOT NULL,
    checker VARCHAR(50),
    created_at VARCHAR(50) NOT NULL DEFAULT CONVERT(VARCHAR(50), GETDATE(), 121),
    employee_id VARCHAR(50),
    financial_txn_limit_bdt BIGINT NOT NULL DEFAULT 0,
    ho_funding_limit_bdt BIGINT NOT NULL DEFAULT 0,
    rights NVARCHAR(MAX),
    FOREIGN KEY (role) REFERENCES frms_ho_role_policy(role)
);

CREATE INDEX idx_sec_user_username ON frms_sec_directory_user(username);
CREATE INDEX idx_sec_user_role ON frms_sec_directory_user(role);


CREATE TABLE frms_sec_employee (
    id VARCHAR(50) PRIMARY KEY,
    employee_no VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    linked_username VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Terminated'))
);

ALTER TABLE frms_sec_directory_user
ADD CONSTRAINT fk_sec_user_employee
FOREIGN KEY (employee_id) REFERENCES frms_sec_employee(id);

CREATE INDEX idx_sec_employee_no ON frms_sec_employee(employee_no);
CREATE INDEX idx_sec_employee_email ON frms_sec_employee(email);


CREATE TABLE frms_sec_audit (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL DEFAULT CONVERT(VARCHAR(50), GETDATE(), 121),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(200) NOT NULL,
    details NVARCHAR(MAX)
);

CREATE INDEX idx_sec_audit_actor_at ON frms_sec_audit(actor, at);


CREATE TABLE frms_sec_activity (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL DEFAULT CONVERT(VARCHAR(50), GETDATE(), 121),
    username VARCHAR(100) NOT NULL,
    action VARCHAR(200) NOT NULL,
    ip VARCHAR(50)
);

CREATE INDEX idx_sec_activity_username_at ON frms_sec_activity(username, at);

