-- User Rights / Security Directory module 

CREATE TABLE frms_sec_directory_user (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    realm VARCHAR(50) NOT NULL,
    eh_branch_unit VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    maker VARCHAR(50) NOT NULL,
    checker VARCHAR(50),
    created_at VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50),
    financial_txn_limit_bdt BIGINT NOT NULL,
    ho_funding_limit_bdt BIGINT NOT NULL,
    rights NVARCHAR(MAX)
);

CREATE TABLE frms_sec_employee (
    id VARCHAR(50) PRIMARY KEY,
    employee_no VARCHAR(50) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    linked_username VARCHAR(100),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE frms_sec_audit (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(200) NOT NULL,
    details NVARCHAR(MAX)
);

CREATE TABLE frms_sec_activity (
    id VARCHAR(50) PRIMARY KEY,
    at VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(200) NOT NULL,
    ip VARCHAR(50)
);
