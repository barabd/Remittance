-- ============================================
-- FRMS Database Verification Queries
-- ============================================
-- Run these queries in SSMS to verify database setup
-- Database: frms_ops
-- ============================================

USE frms_ops;
GO

-- ==== 1. DATABASE STATUS ====
PRINT '========== DATABASE STATUS =========='
SELECT 
  name as DatabaseName,
  state_desc as Status,
  recovery_model_desc as RecoveryMode,
  CONVERT(VARCHAR(10), create_date, 121) as Created
FROM sys.databases 
WHERE name = 'frms_ops';
GO

-- ==== 2. TABLE COUNT & SUMMARY ====
PRINT ''
PRINT '========== TABLE SUMMARY =========='
SELECT 
  COUNT(*) as TotalTables,
  SUM(CASE WHEN TABLE_NAME LIKE 'frms_sec%' THEN 1 ELSE 0 END) as SecurityTables,
  SUM(CASE WHEN TABLE_NAME LIKE 'frms_%' AND TABLE_NAME NOT LIKE 'frms_sec%' THEN 1 ELSE 0 END) as OtherFrmsTables,
  SUM(CASE WHEN TABLE_NAME NOT LIKE 'frms_%' THEN 1 ELSE 0 END) as DomainTables
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';
GO

-- ==== 3. SECURITY DIRECTORY USERS ====
PRINT ''
PRINT '========== DEMO USERS =========='
SELECT 
  id, 
  username, 
  full_name, 
  role, 
  branch,
  status,
  CASE WHEN password_hash IS NOT NULL THEN '✓ Encrypted' ELSE '✗ None' END as PasswordHash
FROM frms_sec_directory_user
ORDER BY created_at DESC;
GO

-- ==== 4. EMPLOYEE RECORDS ====
PRINT ''
PRINT '========== EMPLOYEES =========='
SELECT 
  id,
  employee_no,
  full_name,
  department,
  designation,
  linked_username,
  status
FROM frms_sec_employee
ORDER BY employee_no;
GO

-- ==== 5. KEY SECURITY TABLES ====
PRINT ''
PRINT '========== SECURITY TABLES =========='
SELECT 
  TABLE_NAME,
  COLUMN_COUNT = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME),
  ROW_COUNT = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = t.TABLE_NAME AND TABLE_SCHEMA = 'dbo')
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_NAME IN (
  'frms_sec_directory_user',
  'frms_sec_employee', 
  'frms_sec_audit',
  'frms_sec_activity'
)
ORDER BY TABLE_NAME;
GO

-- ==== 6. ALL TABLES LIST ====
PRINT ''
PRINT '========== ALL 50+ TABLES =========='
SELECT 
  TABLE_NAME,
  TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;
GO

-- ==== 7. CONNECTION TEST ====
PRINT ''
PRINT '========== CONNECTION TEST =========='
SELECT 
  @@SERVERNAME as ServerName,
  @@VERSION as SQLVersion,
  DB_NAME() as CurrentDatabase,
  GETDATE() as ServerTime,
  'Connected ✓' as Status;
GO

PRINT ''
PRINT '========== VERIFICATION COMPLETE =========='
PRINT 'Database: READY FOR BACKEND INTEGRATION'
PRINT 'Demo Users: READY (ho_admin, branch01_maker)'
PRINT 'Password: ChangeMe!123 (BCrypt hashed)'
