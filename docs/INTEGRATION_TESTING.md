# Integration Testing & Verification Guide

**Purpose**: Verify all frontend, backend, and database components work together  
**Date**: March 29, 2026  
**Status**: Ready for Testing

---

## 🧪 Pre-Deployment Testing Checklist

### **Phase 1: Build Verification** ✅

- [x] Frontend builds without errors
  ```bash
  npm run build
  # Expected: dist/index.html created, no errors
  ```

- [x] Frontend linting passes
  ```bash
  npm run lint
  # Expected: 0 errors
  ```

- [x] TypeScript type checking passes
  ```bash
  tsc --noEmit
  # Expected: 0 errors
  ```

- [ ] Backend compiles (requires Maven/JDK)
  ```bash
  cd server/frms-ops-api
  mvn clean compile
  # Expected: BUILD SUCCESS
  ```

---

### **Phase 2: Database Integration** ⏳ (To be tested on deployment)

#### **Hibernate DDL Auto-Migration**
```yaml
# application-prod.yml should have:
spring.jpa.hibernate.ddl-auto: update

# First boot will:
# 1. Create tables if missing
# 2. Add slab_id column to reconciliation_exception
# 3. Run ReconciliationSlabsDataSeed
# 4. Run ReconciliationExceptionsDataSeed
```

#### **Expected Database State After First Boot**
```sql
-- Check reconciliation_slab table
SELECT COUNT(*) FROM reconciliation_slab;
-- Expected: 4 rows (SLAB-1, SLAB-2, SLAB-3, SLAB-4)

-- Check reconciliation_exception table
SELECT COUNT(*) FROM reconciliation_exception;
-- Expected: 3 rows (REX-0001, REX-0002, REX-0003)

-- Check slab_id population
SELECT id, ref, slab_id FROM reconciliation_exception;
-- Expected:
-- REX-0001 | BEFTN-942114 | SLAB-2
-- REX-0002 | VOS-118220   | SLAB-4
-- REX-0003 | PRT-550019   | NULL
```

---

### **Phase 3: API Endpoint Testing** ⏳

#### **Test 1: List All Slabs**
```bash
# Request
curl -X GET http://localhost:4000/reconciliation/slabs

# Expected Response (200 OK)
{
  "items": [
    {
      "id": "SLAB-1",
      "channel": "BEFTN",
      "slabLabel": "Slab A (0 – 200k BDT)",
      "amountFrom": "৳ 0",
      "amountTo": "৳ 200,000",
      "expectedCredits": 142,
      "matchedCredits": 142,
      "variance": "৳ 0",
      "status": "Balanced"
    },
    ... (3 more slabs)
  ],
  "count": 4,
  "page": 1,
  "pageSize": 10
}
```

**Verification**:
- [ ] Returns 4 slabs
- [ ] All fields populated correctly
- [ ] No null values in required fields

---

#### **Test 2: Filter Slabs by Channel**
```bash
# Request
curl -X GET "http://localhost:4000/reconciliation/slabs?channel=BEFTN"

# Expected Response (200 OK)
{
  "items": [
    {
      "id": "SLAB-1",
      "channel": "BEFTN",
      ...
    },
    {
      "id": "SLAB-2",
      "channel": "BEFTN",
      ...
    }
  ],
  "count": 2,
  ...
}
```

**Verification**:
- [ ] Returns only BEFTN slabs (2 rows)
- [ ] No Vostro slabs in response

---

#### **Test 3: Filter Slabs by Status**
```bash
# Request
curl -X GET "http://localhost:4000/reconciliation/slabs?status=Review"

# Expected Response (200 OK)
{
  "items": [
    {
      "id": "SLAB-2",
      "status": "Review",
      ...
    },
    {
      "id": "SLAB-4",
      "status": "Review",
      ...
    }
  ],
  "count": 2,
  ...
}
```

**Verification**:
- [ ] Returns only Review status slabs (2 rows)
- [ ] SLAB-1 and SLAB-3 (Balanced) not included

---

#### **Test 4: List All Exceptions** (No Filter)
```bash
# Request
curl -X GET http://localhost:4000/reconciliation/exceptions

# Expected Response (200 OK)
{
  "items": [
    {
      "id": "REX-0001",
      "ref": "BEFTN-942114",
      "source": "BEFTN",
      "detectedAt": "2026-03-25 10:06",
      "amount": "৳ 295,000.00",
      "reason": "Amount mismatch",
      "status": "Open",
      "slabId": "SLAB-2"
    },
    ... (2 more exceptions)
  ],
  "count": 3,
  ...
}
```

**Verification**:
- [ ] Returns 3 exceptions
- [ ] Each exception has `slabId` field
- [ ] REX-0001 linked to SLAB-2
- [ ] REX-0002 linked to SLAB-4
- [ ] REX-0003 has null slabId

---

#### **Test 5: Filter Exceptions by Slab** ⭐ (NEW INTEGRATION)
```bash
# Request — This is the KEY INTEGRATION POINT
curl -X GET "http://localhost:4000/reconciliation/exceptions?slabId=SLAB-2"

# Expected Response (200 OK)
{
  "items": [
    {
      "id": "REX-0001",
      "ref": "BEFTN-942114",
      "source": "BEFTN",
      "detectedAt": "2026-03-25 10:06",
      "amount": "৳ 295,000.00",
      "reason": "Amount mismatch",
      "status": "Open",
      "slabId": "SLAB-2"  ← MATCHES FILTER
    }
  ],
  "count": 1,
  ...
}
```

**Verification**:
- [ ] Returns only 1 exception (REX-0001)
- [ ] Exception has slabId = SLAB-2
- [ ] REX-0002 (SLAB-4) NOT included
- [ ] REX-0003 (null slabId) NOT included

---

#### **Test 6: Filter Exceptions by Slab (Empty Result)**
```bash
# Request
curl -X GET "http://localhost:4000/reconciliation/exceptions?slabId=SLAB-1"

# Expected Response (200 OK)
{
  "items": [],
  "count": 0,
  ...
}
```

**Verification**:
- [ ] Returns empty array (SLAB-1 has no linked exceptions)
- [ ] No error, graceful empty response

---

#### **Test 7: Resolve Exception**
```bash
# Request
curl -X POST http://localhost:4000/reconciliation/exceptions/REX-0001/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolutionNote":"Amount verified with bank statement"}'

# Expected Response (200 OK)
{
  "id": "REX-0001",
  "ref": "BEFTN-942114",
  "source": "BEFTN",
  "detectedAt": "2026-03-25 10:06",
  "amount": "৳ 295,000.00",
  "reason": "Amount mismatch",
  "status": "Resolved",  ← CHANGED
  "slabId": "SLAB-2",
  "resolutionNote": "Amount verified with bank statement"
}
```

**Verification**:
- [ ] Status changed to "Resolved"
- [ ] Resolution note saved
- [ ] slabId still preserved in response
- [ ] Database updated correctly

---

### **Phase 4: Frontend UI Testing** ⏳

#### **Test 1: Page Loads & Shows Slabs**
1. Navigate to `http://localhost:5173/reconciliation/slabs`
2. Wait for page to load
3. Verify:
   - [ ] Page title: "Slab-wise BEFTN & Vostro reconciliation"
   - [ ] DataGrid shows 4 slabs
   - [ ] Channel filter dropdown present
   - [ ] Status filter dropdown present
   - [ ] "View Exceptions" button visible on each row

---

#### **Test 2: Filter Slabs by Channel**
1. Click "Channel" dropdown
2. Select "BEFTN"
3. Verify:
   - [ ] Grid shows only 2 slabs (SLAB-1, SLAB-2)
   - [ ] Both have channel = "BEFTN"
   - [ ] SLAB-3 and SLAB-4 (Vostro) hidden

---

#### **Test 3: Filter Slabs by Status**
1. Click "Status" dropdown (reset Channel first)
2. Select "Review"
3. Verify:
   - [ ] Grid shows only 2 slabs (SLAB-2, SLAB-4)
   - [ ] Both have status = "Review"
   - [ ] SLAB-1 and SLAB-3 (Balanced) hidden

---

#### **Test 4: Open Drawer (Drill-Down)** ⭐ (NEW INTEGRATION)
1. Click "Exceptions" button on SLAB-2 row
2. Verify:
   - [ ] Right-side drawer opens smoothly
   - [ ] Drawer header shows: "Exceptions: Slab B (200k – 1M BDT)"
   - [ ] Slab details visible:
     - Channel: BEFTN
     - Expected / Matched: 38 / 37
     - Variance: ৳ 12,500
   - [ ] Exception grid appears with 1 row
   - [ ] Exception details visible:
     - Reference: BEFTN-942114
     - Source: BEFTN
     - Amount: ৳ 295,000.00
     - Reason: Amount mismatch
     - Status chip: red "Open"

---

#### **Test 5: Switch Between Slabs**
1. Drawer still open from Test 4
2. Close drawer (click X or click outside)
3. Click "Exceptions" button on SLAB-4
4. Verify:
   - [ ] Drawer opens again
   - [ ] Header now shows: "Exceptions: Nostro mirror — EUR"
   - [ ] Grid shows different exception (REX-0002)
   - [ ] Data correctly switched

---

#### **Test 6: View Slab with No Exceptions**
1. Click "Exceptions" on SLAB-1
2. Verify:
   - [ ] Drawer opens
   - [ ] Grid shows: "No exceptions found for this slab"
   - [ ] No errors in console

---

#### **Test 7: API Connection Status**
1. Verify Alert banner below title
2. If backend running:
   - [ ] Alert shows: "✅ Live API connected"
3. If backend stopped:
   - [ ] Alert shows: "⚠️ Live API off — showing local demo slabs"
   - [ ] Page still functional with demo data

---

### **Phase 5: Browser Console Testing** ⏳

With browser DevTools open, verify no console errors:

#### **Test 1: No TypeScript/Runtime Errors**
```javascript
// In browser console, should see:
// ✅ No red error messages
// ✅ No yellow warnings (except for known third-party libraries)
```

#### **Test 2: Network Calls**
1. Open Network tab in DevTools
2. Click "Exceptions" button
3. Verify:
   - [ ] GET request to `http://localhost:4000/reconciliation/exceptions?slabId=SLAB-2`
   - [ ] Response status: 200 OK
   - [ ] Response time: < 500ms
   - [ ] Response body: Valid JSON with exceptions array

---

### **Phase 6: Edge Cases & Error Handling** ⏳

#### **Test 1: Backend Server Down**
1. Stop backend server
2. Navigate to `/reconciliation/slabs`
3. Verify:
   - [ ] Page still loads with demo data
   - [ ] Error banner shows: "Failed to load... Showing local fallback rows"
   - [ ] Click "Exceptions" still works with demo exceptions
   - [ ] No crash or white screen

---

#### **Test 2: Slow Network Simulation**
1. Open DevTools → Network → Throttle to "Slow 3G"
2. Click "Exceptions" button
3. Verify:
   - [ ] Loading spinner appears in drawer
   - [ ] Exceptions grid stays empty while loading
   - [ ] After response, grid populates
   - [ ] No timeout errors

---

#### **Test 3: Invalid slabId Parameter**
```bash
# Request
curl "http://localhost:4000/reconciliation/exceptions?slabId=INVALID-SLAB"

# Expected Response
{
  "items": [],
  "count": 0,
  ...
}
```

Verify:
- [ ] Returns empty array, not error
- [ ] Status 200 OK, not 404
- [ ] Frontend handles gracefully

---

### **Phase 7: Performance Testing** ⏳

#### **Test 1: Initial Page Load**
```bash
# Measure time to interactive
# Target: < 2 seconds with live API
# Target: < 1 second with demo data
```

#### **Test 2: Drill-Down Response Time**
```bash
# Click "Exceptions" and measure time
# Target: < 500ms for API call + render
```

#### **Test 3: Grid with Many Exceptions**
1. Seed database with 100+ exceptions for SLAB-2
2. Click "Exceptions" on SLAB-2
3. Verify:
   - [ ] Grid paginates (shows 10 at a time)
   - [ ] No lag or freeze
   - [ ] Pagination controls work

---

## 🚀 Integration Testing Execution Plan

### **Environment Setup**

#### **Local Development**
```bash
# Terminal 1: Start backend
cd server/frms-ops-api
java -jar target/frms-ops-api.jar
# or: ./mvnw spring-boot:run

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Open browser
http://localhost:5173/reconciliation/slabs
```

#### **Docker Deployment**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Wait 30 seconds for services to start
sleep 30

# Test endpoints
curl http://localhost:4000/reconciliation/slabs
curl http://localhost/reconciliation/slabs  # via Nginx

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📊 Test Results Template

```markdown
# Integration Test Results — Reconciliation Slabs
Date: ___________
Tester: ___________
Environment: [ ] Local Dev [ ] Docker [ ] Cloud

## Phase 1: Build Verification
- [ ] Frontend build: ✅ PASS / ❌ FAIL
- [ ] Frontend lint: ✅ PASS / ❌ FAIL
- [ ] TypeScript types: ✅ PASS / ❌ FAIL
- [ ] Backend compile: ✅ PASS / ❌ FAIL

## Phase 2: Database
- [ ] Tables created: ✅ PASS / ❌ FAIL
- [ ] Seed data populated: ✅ PASS / ❌ FAIL
- [ ] slab_id column exists: ✅ PASS / ❌ FAIL

## Phase 3: API Endpoints
- [ ] GET /reconciliation/slabs: ✅ PASS / ❌ FAIL
- [ ] GET /reconciliation/slabs?channel=BEFTN: ✅ PASS / ❌ FAIL
- [ ] GET /reconciliation/exceptions: ✅ PASS / ❌ FAIL
- [ ] GET /reconciliation/exceptions?slabId=SLAB-2: ✅ PASS / ❌ FAIL
- [ ] POST /reconciliation/exceptions/{id}/resolve: ✅ PASS / ❌ FAIL

## Phase 4: Frontend UI
- [ ] Page loads: ✅ PASS / ❌ FAIL
- [ ] Slabs displayed: ✅ PASS / ❌ FAIL
- [ ] Channel filter works: ✅ PASS / ❌ FAIL
- [ ] Status filter works: ✅ PASS / ❌ FAIL
- [ ] "View Exceptions" button works: ✅ PASS / ❌ FAIL
- [ ] Drawer opens/closes: ✅ PASS / ❌ FAIL
- [ ] Exceptions load in drawer: ✅ PASS / ❌ FAIL

## Phase 5: Error Handling
- [ ] Backend down handled: ✅ PASS / ❌ FAIL
- [ ] Empty results handled: ✅ PASS / ❌ FAIL
- [ ] No console errors: ✅ PASS / ❌ FAIL

## Phase 6: Performance
- [ ] Page load time: ________ ms (Target: <2000ms)
- [ ] API call time: ________ ms (Target: <500ms)
- [ ] Grid render time: ________ ms (Target: <200ms)

## Summary
- Total Tests: _____ / _____
- Pass Rate: _____%
- Critical Issues: _____
- Notes: ___________
```

---

## ✅ Sign-Off Criteria

Before deploying to production, verify:

- [ ] All Phase 1-3 tests PASS
- [ ] All Phase 4 tests PASS
- [ ] No critical console errors
- [ ] Performance targets met
- [ ] Database-API-Frontend chain confirmed working
- [ ] Fallback demo data works when API unavailable
- [ ] Code review approved
- [ ] Security VAPT passed
- [ ] Load testing (10+ concurrent users) passed

---

## 📝 Known Issues / Workarounds

| Issue | Workaround | Status |
|-------|-----------|--------|
| Maven not in PATH | Use Docker or `mvnw` wrapper | ⏳ Deploy with Docker |
| Browser cache | Clear cache or hard refresh (Ctrl+Shift+R) | ℹ️ Normal dev behavior |
| CORS errors | Add to backend `application.yml` | ✅ Already configured |

---

**Ready to test! Follow the checklist above for comprehensive validation.** ✅
