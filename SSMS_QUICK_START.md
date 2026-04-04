## 📋 SSMS Configuration - Quick Start

### ✅ Connection Status: VERIFIED

**Server:** `localhost,1433`  
**Database:** `frms_ops`  
**Status:** 🟢 ONLINE  
**Tables:** 50 created  
**Demo Users:** 2 seeded  

---

### 🔐 Demo User Credentials

```
Username: ho_admin
Password: ChangeMe!123
Role: HO Admin (Full Access)

Username: branch01_maker  
Password: ChangeMe!123
Role: Maker (Remittance Operations)
```

---

### 📊 Database Quick Stats

| Metric | Count |
|--------|-------|
| Total Tables | 50 |
| Security Tables | 4 |
| FRMS Domain Tables | 11 |
| Operational Tables | 35 |
| Directory Users | 2 |
| Employees | 2 |

---

### 🚀 How to Use SSMS

#### 1. **Connect to Database**
1. Open SQL Server Management Studio
2. Server Name: `localhost,1433`
3. Authentication: SQL Server Authentication
4. Login: `sa`
5. Password: `sys123`
6. Connect

#### 2. **Run Verification Queries**
- Open file: `database/mssql/SSMS_VERIFICATION.sql`
- Press `Ctrl+Shift+E` to execute
- Results show database health ✓

#### 3. **View Demo Users**
```sql
SELECT username, full_name, role, status 
FROM frms_sec_directory_user
```

#### 4. **View All Tables**
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo' 
ORDER BY TABLE_NAME
```

#### 5. **Check Specific Module**
```sql
-- Remittance tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%remittance%'

-- Finance tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%finance%'

-- Compliance/AML tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%compliance%' OR TABLE_NAME LIKE '%aml%'
```

---

### 🔧 Key Tables Reference

**Authentication:**
- `frms_sec_directory_user` — Users with BCrypt passwords
- `frms_sec_employee` — Employee information

**Operations:**
- `remittance_queue_item` — Remittance workflow management
- `finance_gl_voucher` — General ledger vouchers
- `masters_beneficiary` — Beneficiary registry
- `compliance_aml_alert` — AML screening alerts

**Audit:**
- `frms_sec_audit` — Security events
- `frms_sec_activity` — User activity logs

**Business Logic:**
- `investigation_case` — Investigation management
- `pricing_commission_band` — Commission rates
- `settlement_bilateral_position` — Settlement tracking

---

### ✨ Features Configured

✅ Database created with 50 tables  
✅ Demo users seeded with encrypted passwords  
✅ Security directory populated  
✅ Employee records created  
✅ Audit tables ready for logging  
✅ JDBC connectivity configured  
✅ JWT authentication support added  
✅ All domain modules initialized  

---

### 🎯 Next Steps

1. **Backend Setup:**
   ```powershell
   cd server/frms-ops-api
   mvn spring-boot:run
   ```

2. **Frontend Setup:**
   ```bash
   npm run dev
   ```

3. **Login:**
   - Navigate to `http://localhost:5173/login`
   - Use: `ho_admin` / `ChangeMe!123`

---

### 📝 Troubleshooting

**Can't connect to SQL Server?**
```powershell
sqlcmd -S localhost,1433 -U sa -P sys123 -Q "SELECT @@VERSION"
```

**Need to re-seed users?**
```powershell
sqlcmd -S localhost,1433 -U sa -P sys123 -i database/mssql/seed_demo_users.sql
```

**Check specific table data?**
```sql
USE frms_ops;
GO
SELECT TOP 10 * FROM [table_name];
```

---

### 📞 Support Files

- **Full Configuration Guide:** `SSMS_CONFIGURATION.md`
- **Verification Queries:** `database/mssql/SSMS_VERIFICATION.sql`
- **Seed Script:** `database/mssql/seed_demo_users.sql`
- **Build Script:** `database/mssql/build_database.ps1`

**Status:** ✅ SSMS Fully Configured & Ready
