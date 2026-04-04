# SSMS Configuration Guide for FRMS Database

## Connection Information

**Server Name:** `localhost,1433` or `DESKTOP-45BVVP2\SQLEXPRESS`  
**Authentication:** SQL Server Authentication  
**Login:** `sa`  
**Password:** `sys123`  
**Database:** `frms_ops`

---

## Quick Verification Queries (Copy & Paste in SSMS)

### 1. Verify Database & Tables
```sql
USE frms_ops;

-- Check database exists
SELECT name, state_desc, recovery_model_desc 
FROM sys.databases 
WHERE name = 'frms_ops';

-- Count total tables
SELECT COUNT(*) as TotalTables 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- List all tables
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
ORDER BY TABLE_NAME;
```

### 2. Verify Security Directory Users
```sql
USE frms_ops;

-- View demo users
SELECT 
  id, username, full_name, role, branch, 
  status, rights, 
  CASE WHEN password_hash IS NOT NULL THEN 'Encrypted' ELSE 'None' END as [Auth]
FROM frms_sec_directory_user
ORDER BY created_at DESC;

-- Check user count
SELECT COUNT(*) as UserCount FROM frms_sec_directory_user;
```

### 3. Verify Employee Records
```sql
USE frms_ops;

SELECT 
  id, employee_no, full_name, department, 
  designation, email, linked_username, status
FROM frms_sec_employee
ORDER BY employee_no;
```

### 4. Check Key Tables Exist
```sql
USE frms_ops;

SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
  'frms_sec_directory_user',
  'frms_sec_employee',
  'frms_sec_audit',
  'frms_sec_activity',
  'finance_gl_voucher',
  'masters_beneficiary',
  'remittance_queue_item',
  'compliance_aml_alert'
)
ORDER BY TABLE_NAME;
```

---

## Database Schema Overview

### Security & Administration (4 tables)
- `frms_sec_directory_user` — Users with roles and rights
- `frms_sec_employee` — Employee records
- `frms_sec_audit` — Security audit logs
- `frms_sec_activity` — User activity tracking

### Operations & Remittance (17 tables)
- `remittance_queue_item` — Remittance workflow
- `remittance_record` — Core remittance data
- `disbursement_item` — Payout instructions
- `ops_notification`, `ops_email_outbox`, `ops_feedback_log`

### Masters & AML (8 tables)
- `masters_beneficiary` — Beneficiary registry
- `masters_agent` — Agent/exchange house data
- `masters_cover_fund` — Cover fund records
- `compliance_aml_alert` — AML screening alerts
- `investigation_case` — Case management

### Finance (5 tables)
- `finance_gl_voucher` — GL entries
- `pricing_commission_band` — Commission rates
- `pricing_bank_fx_rate` — FX rates
- `pricing_fx_range_band` — FX range bands
- `finance_incentive_distribution_batch` — Incentive batches

### Additional (16 tables)
- Settlement, risk control, report, head office, and utility tables

---

## Demo User Credentials

| Username | Password | Role | Rights |
|----------|----------|------|--------|
| `ho_admin` | `ChangeMe!123` | HO Admin | Full access (dashboard, remittance, compliance, finance, reports, head_office, admin, security) |
| `branch01_maker` | `ChangeMe!123` | Maker | Remittance operations (dashboard, remittance, reports) |

**Note:** Passwords are BCrypt-hashed in the database. Change them after first login in production.

---

## Backend Connection (@application.yml)

The Spring Boot backend will connect with:

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=frms_ops;encrypt=false;trustServerCertificate=true
    username: sa
    password: sys123
```

---

## Troubleshooting

### Connection Failed
- Verify SQL Server is running: `sqlcmd -S localhost,1433 -U sa -P sys123 -Q "SELECT @@VERSION"`
- Check firewall allows port 1433
- Ensure SQL Server TCP/IP is enabled in Configuration Manager

### Demo Users Not Showing
- Run: `c:\Users\BARABD\Desktop\Remittance\database\mssql\seed_demo_users.sql`
- Or manually execute SQL queries above

### Password Hash Issues
- BCrypt hash for `ChangeMe!123`: `$2a$10$N9qo8uLOickgx2ZMRZoMyeBZH.0ql7DbPKt/7V/R4ZDlO6v4WCKy2`
- Spring Security will auto-generate hashes on first backend startup if needed

---

## Next Steps

1. **Test connection in SSMS:**
   - Connect to `localhost,1433` with credentials above
   - Verify all tables and demo users

2. **Start Spring Boot backend:**
   ```powershell
   cd server/frms-ops-api
   mvn spring-boot:run
   ```

3. **Start React frontend:**
   ```bash
   npm run dev
   ```

4. **Login with demo credentials** at `http://localhost:5173/login`
