# Browser Testing Guide - FRMS Admin Dashboard

## 🎯 Complete Step-by-Step Verification

---

## **Phase 1: Prerequisites (5 minutes)**

### Step 1.1: Verify Database is Running
```powershell
# Open PowerShell and check SQL Server connection
sqlcmd -S localhost,1433 -U sa -P sys123 -Q "SELECT @@VERSION"
```
**Expected**: Shows SQL Server version (2019, 2022, etc.)

### Step 1.2: Verify Files Exist
```powershell
# Check critical files
cd "C:\Users\BARABD\Desktop\Remittance"
Test-Path "package.json" # Should show: True
Test-Path "server/frms-ops-api/pom.xml" # Should show: True
Test-Path "src/pages/LoginPage.tsx" # Should show: True
```

---

## **Phase 2: Start Services (10 minutes)**

### Step 2.1: Terminal 1 - Start Frontend (Vite + Mock API)
```bash
cd "C:\Users\BARABD\Desktop\Remittance"
npm run dev:full
```
**Expected Output**:
```
🚀 Starting FRMS Admin Dashboard (Full Stack Mode)
✅ Mock FRMS Operations API Server running on http://localhost:4000
⏳ Starting Vite dev server...
VITE v8.0.2  ready in 223 ms
  ➜  Local:   http://localhost:5173/
```

### Step 2.2: Terminal 2 - Start Backend (Spring Boot)
```bash
cd "C:\Users\BARABD\Desktop\Remittance\server\frms-ops-api"
mvn spring-boot:run
```
**Expected Output** (after ~30 seconds):
```
Started FrmsOpsApplication in 12.345 seconds
Tomcat started on port(s): 4000 (http)
```

### Step 2.3: Verify Services are Running
```powershell
# In another PowerShell window, test all services
$ports = @{
  "Frontend (Vite)" = 5173
  "Mock API" = 4000
  "Backend (Spring)" = 4000
  "Database" = 1433
}

foreach ($svc in $ports.GetEnumerator()) {
  $port = $svc.Value
  try {
    $conn = New-Object System.Net.Sockets.TcpClient
    $conn.Connect("127.0.0.1", $port)
    "✓ $($svc.Key): PORT $port OPEN"
    $conn.Close()
  } catch {
    "✗ $($svc.Key): PORT $port CLOSED"
  }
}
```

---

## **Phase 3: Browser Testing (20 minutes)**

### **Test Group A: Frontend Loading & Mock API**

#### Test A1: Frontend Homepage
1. Open browser: **http://localhost:5173/**
2. **Expected**:
   - ✅ Browser loads without errors
   - ✅ FRMS Admin logo visible
   - ✅ Dashboard page visible
   - ✅ Blue/white theme loads

#### Test A2: Check Mock API Health
1. New tab: **http://localhost:4000/health**
2. **Expected JSON Response**:
   ```json
   {
     "ok": true,
     "service": "frms-ops-api-mock",
     "port": 4000
   }
   ```

#### Test A3: Check Dashboard Metrics
1. New tab: **http://localhost:4000/api/v1/metrics/dashboard**
2. **Expected JSON Response**:
   ```json
   {
     "ok": true,
     "service": "admin-dashboard-dev",
     "stats": {
       "worklist": 11,
       "pending": 21,
       "processed": 136,
       "flagged": 3
     }
   }
   ```

---

### **Test Group B: JWT Authentication & Login**

#### Test B1: Attempt Access Without Login (if required)
1. Refresh http://localhost:5173/
2. **Expected (if JWT enabled)**:
   - ✅ Redirected to `/login`
   - ✅ Login form visible
3. **Expected (if JWT disabled)**:
   - ✅ Dashboard loads directly (no login required)

#### Test B2: Backend Auth Health Check
1. New tab: **http://localhost:4000/auth/health**
2. **Expected JSON Response**:
   ```json
   {
     "status": "up",
     "module": "auth"
   }
   ```

#### Test B3: Test Login Credentials (Demo User)
1. Go to: **http://localhost:5173/login**
2. **Expected Form**:
   - Username field
   - Password field
   - "Sign in" button
   - Demo credentials displayed at bottom

#### Test B4: Successful Login
1. **Enter credentials**:
   - Username: `ho_admin`
   - Password: `ChangeMe!123`
2. **Click "Sign in"**
3. **Expected**:
   - ✅ Form submits (no error)
   - ✅ Redirects to dashboard
   - ✅ User profile shows "Head Office Admin" (top right)
   - ✅ User initials "HA" in avatar

#### Test B5: Failed Login
1. Go back to: **http://localhost:5173/login**
2. **Enter wrong credentials**:
   - Username: `ho_admin`
   - Password: `wrongpassword`
3. **Click "Sign in"**
4. **Expected**:
   - ✅ Red error message: "Invalid username or password"
   - ✅ Form remains visible
   - ✅ No redirect

#### Test B6: Second Demo User Login
1. Go to: **http://localhost:5173/login**
2. **Enter credentials**:
   - Username: `branch01_maker`
   - Password: `ChangeMe!123`
3. **Click "Sign in"**
4. **Expected**:
   - ✅ Redirects to dashboard
   - ✅ Avatar shows "BM" (Branch01 Maker initials)
   - ✅ Profile shows "Branch 01 Maker"

---

### **Test Group C: User Profile & RBAC**

#### Test C1: View Current User Profile
1. Logged in as `ho_admin`
2. **Browser DevTools** → **Application** tab → **Session Storage**
3. **Expected**:
   - ✅ Key `frms.accessToken` exists
   - ✅ Token is long JWT string (3 parts: `xxxxx.yyyyy.zzzzz`)

#### Test C2: Profile Menu
1. Top-right corner → Click avatar **"HA"**
2. **Expected dropdown menu**:
   - ✅ User name: "Head Office Admin"
   - ✅ Role/Branch: "Head Office · HO Admin"
   - ✅ Options: Settings, Profile, Change Password, Logout

#### Test C3: Logout & Session Cleanup
1. Click avatar → **"Logout"**
2. **Expected**:
   - ✅ Redirects to login page
   - ✅ SessionStorage token cleared
   - ✅ Profile data cleared

#### Test C4: Access Token in API Calls
1. Logged in as `ho_admin`
2. **Browser DevTools** → **Network** tab
3. Go to **http://localhost:5173/dashboard**
4. **Find any API request** (e.g., `metrics/dashboard`)
5. Click on it → **Headers** section
6. **Expected**:
   - ✅ Authorization header: `Bearer eyJhbGc...` (JWT token)

---

### **Test Group D: Dashboard & Data Integrity**

#### Test D1: Dashboard Loads with Data
1. Logged in as `ho_admin`
2. Navigate to: **http://localhost:5173/dashboard**
3. **Expected**:
   - ✅ Page loads without 404/500 errors
   - ✅ Sidebar menu visible (Operations, Remittance, Compliance, etc.)
   - ✅ Top metrics visible (Worklist, Pending, Processed, Flagged)

#### Test D2: Sidebar Navigation
1. **Click each menu item**:
   - Operations Hub
   - Remittance Approval Queue
   - Investigation Cases
   - Compliance Rules
   - Finance Reports
   - Bulk Data Hub
2. **Expected** for each:
   - ✅ Page loads (may show placeholder)
   - ✅ No 401/403 errors
   - ✅ Correct title displays

#### Test D3: Check Role-Based Menu Visibility
1. **As `ho_admin`** (Full Admin):
   - All menu items visible ✓
2. **Logout, then login as `branch01_maker`**:
   - Limited menu (only Dashboard, Remittance, Reports visible)
   - Security/Admin sections hidden ✓

#### Test D4: Compliance Rules Readiness
1. Navigate to: **http://localhost:5173/compliance/rules**
2. Browser DevTools → Network
3. **Expected API calls**:
   - ✅ `GET /api/v1/compliance/rules-readiness` → returns database stats

---

### **Test Group E: API Integration & Errors**

#### Test E1: Check Browser Console Errors
1. **At any page** → Press `F12` (DevTools)
2. **Go to Console tab**
3. **Expected**:
   - ✅ No red JS errors
   - ✅ May show warnings (yellow) - OK
   - ✅ CORS warnings should be resolved

#### Test E2: API Error Handling
1. Go to: **http://localhost:5173/operations/hub**
2. Open DevTools → **Network** tab
3. **Look for API responses**:
   - ✅ Status 200 (success)
   - ✅ JSON responses valid
   - If 404: expected (endpoint may not exist yet)

#### Test E3: Test 404/500 Error Page
1. Navigate to: **http://localhost:5173/does-not-exist**
2. **Expected**:
   - ✅ "Not Found" placeholder page displays
   - ✅ No white screen
   - ✅ Can navigate back via menu

---

### **Test Group F: Database Verification**

#### Test F1: Verify Database Has Demo Data
```sql
-- Run in SQL Server Management Studio (SSMS)
USE frms_ops;
GO

-- Check users
SELECT username, role, status FROM frms_sec_directory_user;
-- Expected: ho_admin (HO Admin, Active), branch01_maker (Maker, Active)

-- Check passwords are hashed
SELECT username, LEN(password_hash) as HashLength FROM frms_sec_directory_user;
-- Expected: 60 bytes (BCrypt)

-- Check employees
SELECT employee_no, full_name, linked_username FROM frms_sec_employee;
-- Expected: HO-0001 → ho_admin, BR-0102 → branch01_maker
```

#### Test F2: Check Total Tables Created
```sql
USE frms_ops;
GO
SELECT COUNT(*) as TotalTables FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
-- Expected: 50+
```

---

## **Phase 4: Advanced Testing (Optional - 10 minutes)**

### Test X1: JWT Token Expiration
1. Logged in as `ho_admin`
2. Get JWT token from SessionStorage
3. **Manually edit token in browser DevTools** → Session Storage → `frms.accessToken` 
4. Change last character to invalidate signature
5. Try any API call
6. **Expected**:
   - ✅ API returns 401 Unauthorized
   - ✅ Redirects to login automatically

### Test X2: Concurrent Sessions
1. **Browser 1**: Logged in as `ho_admin`
2. **Browser 2** or **Incognito**: Login as `branch01_maker`
3. **Expected**:
   - ✅ Both sessions work independently
   - ✅ Different tokens in each sessionStorage
   - ✅ Different user profiles displayed

### Test X3: Network Throttling
1. DevTools → **Network** tab → **Throttling** → Set to "Slow 3G"
2. Login and navigate pages
3. **Expected**:
   - ✅ Loading states visible
   - ✅ No crashes
   - ✅ UI responsive

### Test X4: Response Time Monitoring
1. DevTools → **Network** tab
2. Make several API calls
3. **Check timing**:
   - Login: < 1s
   - Dashboard load: < 2s
   - API requests: < 500ms

---

## **Phase 5: Troubleshooting Matrix**

| Issue | Solution |
|-------|----------|
| **Login page stuck loading** | Check backend: `mvn spring-boot:run` is running |
| **401 Unauthorized errors** | Clear sessionStorage, re-login with correct credentials |
| **"VITE_USE_LIVE_API=false"** | Backend not available; frontend uses mock API instead |
| **Database connection failed** | Verify SQL Server running: `sqlcmd -S localhost,1433 -U sa -P sys123` |
| **CORS errors** | Normal; proxy in vite.config.ts handles this |
| **Dashboard blank** | Open DevTools Console; check for JS errors |
| **Avatar shows "A" instead of initials** | User profile not loaded; check JWT token validity |

---

## **✅ Final Verification Checklist**

- [ ] Frontend loads at http://localhost:5173/
- [ ] Mock API responds at http://localhost:4000/health
- [ ] Backend Spring Boot running on port 4000
- [ ] Database SQL Server accessible
- [ ] Login form appears when accessing dashboard
- [ ] Demo user credentials work (ho_admin / ChangeMe!123)
- [ ] JWT token stored in sessionStorage
- [ ] User profile displays after login
- [ ] Dashboard shows correct data
- [ ] Menu items render based on user role
- [ ] Logout clears session
- [ ] No 500 errors in browser console

---

## **🎯 What You're Testing**

| Component | What to Check | Pass Criteria |
|-----------|---------------|---------------|
| **Frontend** | Loads in browser, no JS errors | ✅ Renders, no errors |
| **Authentication** | Login with correct/incorrect credentials | ✅ Redirects on success, error on fail |
| **JWT** | Token created, stored, sent in requests | ✅ Token in sessionStorage and Authorization header |
| **Database** | Demo users exist, passwords hashed | ✅ Users retrievable, hashes 60 chars |
| **RBAC** | Menu items visible/hidden by role | ✅ Admin sees all, Maker sees limited |
| **API** | Mock and real endpoints respond | ✅ Status 200 with valid JSON |
| **Session** | User remains logged in across pages | ✅ Profile persists until logout |

**Estimated Total Time: 45-60 minutes for all phases**
