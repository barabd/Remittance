# ✅ FRMS Project - Complete Setup Done!

## 🎯 What's Running NOW

| Component | Port | Status | URL |
|-----------|------|--------|-----|
| **Frontend (Vite)** | 5173 | ✅ Running | http://localhost:5173 |
| **Mock API** | 4000 | ✅ Running | http://localhost:4000/health |
| **Spring Boot Backend** | 8080 | ✅ Running | http://localhost:8080/api/v1 |
| **SQL Server Database** | 1433 | ✅ Online | frms_ops (ready) |
| **Java 17** | - | ✅ Installed | C:\tools\jdk-17 |
| **Maven 3.9** | - | ✅ Installed | C:\tools\maven-3.9.6 |

---

## 🔐 Demo Credentials

```
Username:  ho_admin
Password:  ChangeMe!123

OR

Username:  branch01_maker
Password:  ChangeMe!123
```

---

## 🚀 IMMEDIATE TEST - 5 MINUTES

### **Step 1: Open Browser to Login Page**
```
http://localhost:5173/login
```

### **Step 2: Enter Demo Credentials**
- Username: `ho_admin`
- Password: `ChangeMe!123`
- Click **Sign in**

### **Step 3: Expected Result**
✅ Should redirect to dashboard  
✅ User profile shows "Head Office Admin" (top right)  
✅ Avatar shows "HA" initials  
✅ Sidebar menu displays all modules  

---

## 🔍 Verify Each Component

### **Test A: Frontend Loads**
```
GET http://localhost:5173/
✅ Expected: FRMS Admin dashboard page loads
```

### **Test B: Mock API**
```
GET http://localhost:4000/health
✅ Expected: {"ok": true, "service": "frms-ops-api-mock"}
```

### **Test C: Spring Boot Backend Health**
```
GET http://localhost:8080/api/v1/auth/health
✅ Expected: {"status": "up", "module": "auth"}
```

### **Test D: Database Connection**
```
In SQL Server Management Studio (SSMS):
Server: localhost,1433
Login: sa / sys123
Database: frms_ops
✅ Expected: 50+ tables exist, demo users seeded
```

### **Test E: API Security (JWT)**
```
1. Open DevTools (F12)
2. Go to: Network tab
3. Click on any API request
4. Check Headers tab
✅ Expected: Authorization: Bearer eyJhbGc... (JWT token)
```

---

## 📋 Complete Test Scenario

### **Scenario 1: Successful Login**
```
1. Go to: http://localhost:5173/login
2. Enter: ho_admin / ChangeMe!123
3. Click: Sign in
4. Expected: Redirects to dashboard
```

### **Scenario 2: Failed Login**
```
1. Go to: http://localhost:5173/login
2. Enter: ho_admin / wrongpassword
3. Click: Sign in
4. Expected: Red error "Invalid username or password"
```

### **Scenario 3: Second User Test**
```
1. Go to: http://localhost:5173/login
2. Enter: branch01_maker / ChangeMe!123
3. Click: Sign in
4. Expected: Redirects to dashboard with different user profile
5. Avatar shows: "BM" (different initials)
6. Menu items limited (no Admin/Security sections)
```

### **Scenario 4: Logout**
```
1. Logged in as any user
2. Click avatar (top right)
3. Select: Logout
4. Expected: Redirects to login page
5. SessionStorage cleared (DevTools → Application → Session Storage)
```

### **Scenario 5: Navigation**
```
1. Logged in as ho_admin
2. Click each menu item:
   - Dashboard ✓
   - Operations Hub ✓
   - Remittance Queue ✓
   - Investigation Cases ✓
   - Compliance Rules ✓
   - Finance Reports ✓
3. Expected: All pages load without 401/403 errors
```

---

## 🛠️ Troubleshooting

### **Issue: Getting "Invalid username or password" error even with correct credentials?**

**Solution:**
```powershell
# Reseed database users
cd C:\Users\BARABD\Desktop\Remittance\database\mssql
sqlcmd -S localhost,1433 -U sa -P sys123 -i seed_demo_users.sql
```

### **Issue: Backend not responding at http://localhost:8080?**

**Solution:**
```powershell
# Restart backend
cd "C:\Users\BARABD\Desktop\Remittance\server\frms-ops-api"
$env:JAVA_HOME = "C:\tools\jdk-17"
$env:MAVEN_HOME = "C:\tools\maven-3.9.6"
$env:Path = "C:\tools\jdk-17\bin;C:\tools\maven-3.9.6\bin;$env:Path"
mvn spring-boot:run
```

### **Issue: Frontend shows CORS errors?**

**Solution:**
```
This is normal. Vite proxy in vite.config.ts handles it.
Check DevTools Console for actual blocking errors.
```

### **Issue: Database connection failed?**

**Solution:**
```powershell
# Test SQL Server
sqlcmd -S localhost,1433 -U sa -P sys123 -Q "SELECT @@VERSION"

# Should output: Microsoft SQL Server 2022 (or version)
```

---

## 📊 What You Have Now

✅ **Full Stack Running:**
- Frontend React/TypeScript with Vite
- Backend Spring Boot 3.3.6
- Real JWT Authentication
- Role-Based Access Control (RBAC)
- SQL Server Database with 50+ tables
- Demo users with encrypted passwords
- Mock API for fallback

✅ **Security Implemented:**
- JWT tokens (HS256)
- BCrypt password hashing
- User roles and rights
- Menu RBAC (show/hide by role)
- Authentication required by default

✅ **Technologies:**
- Java 17 + Maven 3.9
- Spring Boot 3.3.6 + Spring Security
- React 19 + TypeScript + MUI
- SQL Server 2022
- JJWT for JWT handling

---

## 🎬 Next Commands to Keep Services Running

### **Frontend (if not running):**
```bash
cd C:\Users\BARABD\Desktop\Remittance
npm run dev:full
```

### **Backend (if not running):**
```bash
cd C:\Users\BARABD\Desktop\Remittance\server\frms-ops-api
$env:JAVA_HOME = "C:\tools\jdk-17"
$env:MAVEN_HOME = "C:\tools\maven-3.9.6"
$env:Path = "C:\tools\jdk-17\bin;C:\tools\maven-3.9.6\bin;$env:Path"
mvn spring-boot:run
```

---

## 📝 Architecture Summary

```
Browser (http://localhost:5173)
         ↓
    Vite Dev Server
    ├─→ Mock API (4000) - For demo endpoints
    └─→ Spring Boot (8080) - For real JWT endpoints
         ↓
    Spring Security + JWT
         ↓
    Database (SSQL Server 1433)
         ↓
    frms_ops with 50+ tables
```

---

## ✨ Key Endpoints

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/auth/login` | POST | No | `{accessToken, user}` |
| `/auth/me` | GET | JWT | `{UserProfile}` |
| `/auth/health` | GET | No | `{status: "up"}` |
| `/dashboard/metrics` | GET | JWT | Dashboard data |
| `/remittance/*` | GET/POST | JWT | Remittance operations |
| `/compliance/*` | GET/PATCH | JWT | Compliance rules |

---

## ✅ Final Checklist

- [ ] Visit http://localhost:5173/login
- [ ] Login with ho_admin / ChangeMe!123
- [ ] Dashboard loads with user profile
- [ ] Click menu items and verify pages load
- [ ] Check DevTools Network tab for JWT Authorization header
- [ ] Logout and verify session cleared
- [ ] Try wrong password and verify error message
- [ ] Login as branch01_maker and verify limited menu
- [ ] All tests passed ✅

---

**STATUS: 🟢 Project Ready for Full Testing**

All components installed and running. Proceed with test scenarios above!
