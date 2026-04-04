-- Seed demo users with BCrypt password hashes for ChangeMe!123
-- BCrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeBZH.0ql7DbPKt/7V/R4ZDlO6v4WCKy2

USE frms_ops;
GO

DECLARE @demoPassHash NVARCHAR(120) = '$2a$10$N9qo8uLOickgx2ZMRZoMyeBZH.0ql7DbPKt/7V/R4ZDlO6v4WCKy2'
DECLARE @now VARCHAR(16) = CONVERT(VARCHAR(16), GETDATE(), 121)

IF NOT EXISTS (SELECT 1 FROM frms_sec_directory_user WHERE username = 'ho_admin')
BEGIN
  INSERT INTO frms_sec_directory_user (
    id, username, full_name, role, branch, realm, eh_branch_unit, 
    status, maker, created_at, financial_txn_limit_bdt, ho_funding_limit_bdt, 
    rights, password_hash
  ) VALUES (
    'USR-001', 'ho_admin', 'Head Office Admin', 'HO Admin', 'Head Office', 'ho', '',
    'Active', 'System', @now, 9999999, 500000000,
    'dashboard,remittance,compliance,finance,reports,head_office,admin,security', @demoPassHash
  )
  PRINT 'Created user: ho_admin (HO Admin)'
END

IF NOT EXISTS (SELECT 1 FROM frms_sec_directory_user WHERE username = 'branch01_maker')
BEGIN
  INSERT INTO frms_sec_directory_user (
    id, username, full_name, role, branch, realm, eh_branch_unit,
    status, maker, created_at, financial_txn_limit_bdt, ho_funding_limit_bdt,
    rights, password_hash
  ) VALUES (
    'USR-102', 'branch01_maker', 'Branch 01 Maker', 'Maker', 'Branch-01', 'branch', '',
    'Active', 'HO Admin', @now, 500000, 0,
    'dashboard,remittance,reports', @demoPassHash
  )
  PRINT 'Created user: branch01_maker (Maker)'
END

-- Seed demo employees
IF NOT EXISTS (SELECT 1 FROM frms_sec_employee WHERE employee_no = 'HO-0001')
BEGIN
  INSERT INTO frms_sec_employee (
    id, employee_no, full_name, department, designation, email, phone, linked_username, status
  ) VALUES (
    'EMP-001', 'HO-0001', 'Head Office Admin', 'Operations', 'HO Administrator',
    'ho.admin@example.com', '+880-1700-000001', 'ho_admin', 'Active'
  )
  PRINT 'Created employee: EMP-001'
END

IF NOT EXISTS (SELECT 1 FROM frms_sec_employee WHERE employee_no = 'BR-0102')
BEGIN
  INSERT INTO frms_sec_employee (
    id, employee_no, full_name, department, designation, email, phone, linked_username, status
  ) VALUES (
    'EMP-102', 'BR-0102', 'Branch 01 Maker', 'Branch Ops', 'Senior Teller',
    'branch01.maker@example.com', '+880-1700-000102', 'branch01_maker', 'Active'
  )
  PRINT 'Created employee: EMP-102'
END

-- Display created users
SELECT 'Demo Users Configured:' as [Setup Status]
GO

SELECT 
  id, username, full_name, role, branch, status,
  CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as [Password Set]
FROM frms_sec_directory_user
ORDER BY created_at DESC
GO
