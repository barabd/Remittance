# Integration Reference: Files Modified & API Changes

**Quick lookup for developers implementing this integration**

---

## 📋 Files Modified (5 Total)

### **Backend — Java/Spring Boot** (3 files)

#### 1️⃣ **ReconciliationExceptionEntity.java**
- **Path**: `server/frms-ops-api/src/main/java/com/frms/ops/reconciliation/ReconciliationExceptionEntity.java`
- **What Changed**:
  ```java
  // ADDED (Line ~37)
  @Column(name = "slab_id", length = 32)
  private String slabId;
  
  // ADDED GETTER (Line ~140+)
  public String getSlabId() {
    return slabId;
  }
  
  // ADDED SETTER (Line ~145+)
  public void setSlabId(String slabId) {
    this.slabId = slabId;
  }
  ```
- **Why**: Link exceptions to slabs in database
- **Impact**: New optional column in `reconciliation_exception` table

#### 2️⃣ **ReconciliationExceptionsDataSeed.java**
- **Path**: `server/frms-ops-api/src/main/java/com/frms/ops/reconciliation/ReconciliationExceptionsDataSeed.java`
- **What Changed**:
  ```java
  // MODIFIED: seed() method
  repo.save(row("REX-0001", "BEFTN-942114", "BEFTN", "2026-03-25 10:06", "৳ 295,000.00", "Amount mismatch", "Open", "SLAB-2"));
  repo.save(row("REX-0002", "VOS-118220", "Vostro", "2026-03-25 09:40", "৳ 120,000.00", "Unmatched credit", "Open", "SLAB-4"));
  repo.save(row("REX-0003", "PRT-550019", "Partner", "2026-03-24 18:05", "৳ 60,000.00", "Duplicate", "Resolved", null));
  
  // MODIFIED: row() method signature (added String slabId parameter)
  private static ReconciliationExceptionEntity row(
      String id,
      String ref,
      String source,
      String detectedAt,
      String amount,
      String reason,
      String status,
      String slabId) {  // ← NEW PARAMETER
    var e = new ReconciliationExceptionEntity();
    // ... other setters ...
    e.setSlabId(slabId);  // ← NEW LINE
    return e;
  }
  ```
- **Why**: Pre-populate database with linked data
- **Impact**: Demo exceptions now have slab associations

#### 3️⃣ **ReconciliationExceptionsController.java**
- **Path**: `server/frms-ops-api/src/main/java/com/frms/ops/reconciliation/ReconciliationExceptionsController.java`
- **What Changed**:
  ```java
  // MODIFIED: list() method signature
  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String source,
      @RequestParam(required = false) String slabId,  // ← NEW PARAMETER
      @RequestParam(required = false) String q,
      ...
  )
  
  // MODIFIED: Inside list() method
  String sb = slabId == null ? "" : slabId.trim();  // ← NEW
  
  // ... existing filters ...
  
  if (!sb.isEmpty()) {
    s = s.filter(r -> sb.equalsIgnoreCase(safe(r.getSlabId())));  // ← NEW FILTER
  }
  
  // ADDED: safe() method (Line ~75)
  private static String safe(String s) {
    return s == null ? "" : s;  // ← NEW HELPER
  }
  
  // MODIFIED: toJson() method
  if (e.getSlabId() != null && !e.getSlabId().isBlank()) {
    m.put("slabId", e.getSlabId());  // ← NEW LINE
  }
  ```
- **Why**: API endpoint to filter exceptions by slab
- **Impact**: New query parameter: `GET /reconciliation/exceptions?slabId=SLAB-X`

---

### **Frontend — React/TypeScript** (2 files)

#### 4️⃣ **src/api/types.ts**
- **Path**: `src/api/types.ts`
- **What Changed**:
  ```typescript
  // MODIFIED: ReconciliationExceptionDto type (Line ~350)
  export type ReconciliationExceptionDto = {
    id: string
    ref: string
    source: 'BEFTN' | 'Vostro' | 'Partner'
    detectedAt: string
    amount: string
    reason: 'Unmatched credit' | 'Amount mismatch' | 'Duplicate' | string
    status: 'Open' | 'Resolved'
    slabId?: string  // ← NEW FIELD (optional)
    resolutionNote?: string
  }
  ```
- **Why**: Type-safe API response handling
- **Impact**: TypeScript now enforces slabId field in responses

#### 5️⃣ **src/pages/reconciliation/ReconciliationSlabsPage.tsx**
- **Path**: `src/pages/reconciliation/ReconciliationSlabsPage.tsx`
- **What Changed**: **COMPLETE REWRITE**
  ```typescript
  // ADDED: Multiple new imports
  import {
    Button,      // ← NEW
    Divider,     // ← NEW
    Drawer,      // ← NEW
    // ... other new imports ...
  } from '@mui/material'
  import OpenInNewIcon from '@mui/icons-material/OpenInNew'  // ← NEW
  import { liveListReconciliationExceptions } from '../../api/live/client'  // ← NEW
  
  // ADDED: ExceptionRow type (similar to SlabRow)
  type ExceptionRow = ReconciliationExceptionDto
  
  // ADDED: Exception fallback data
  const exceptionFallback: ExceptionRow[] = [
    { id: 'REX-0001', ..., slabId: 'SLAB-2' },
    { id: 'REX-0002', ..., slabId: 'SLAB-4' },
  ]
  
  // ADDED: Exception columns definition
  const exceptionColumns: GridColDef<ExceptionRow>[] = [
    { field: 'ref', headerName: 'Reference', ... },
    // ... other columns ...
  ]
  
  // ADDED: Component state for drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSlab, setSelectedSlab] = useState<SlabRow | null>(null)
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([])
  const [exceptionsLoading, setExceptionsLoading] = useState(false)
  
  // ADDED: Load exceptions callback
  const loadExceptions = useCallback(
    (slabId: string) => {
      setExceptionsLoading(true)
      return liveListReconciliationExceptions({ slabId })
        .then((p) => {
          setExceptions(p.items.length > 0 ? (p.items as ExceptionRow[]) : [])
        })
        .catch(() => {
          setExceptions(exceptionFallback.filter((e) => e.slabId === slabId))
        })
        .finally(() => setExceptionsLoading(false))
    },
    [],
  )
  
  // ADDED: View exceptions handler
  const handleViewExceptions = useCallback(
    (slab: SlabRow) => {
      setSelectedSlab(slab)
      setDrawerOpen(true)
      void loadExceptions(slab.id)
    },
    [loadExceptions],
  )
  
  // ADDED: Columns with action button
  const columnsWithActions: GridColDef<SlabRow>[] = [
    ...slabColumns,
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={() => handleViewExceptions(params.row)}
        >
          Exceptions
        </Button>
      ),
    },
  ]
  
  // ADDED: Drawer panel in JSX
  <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {selectedSlab ? (
        <>
          <Typography variant="h6">Exceptions: {selectedSlab.slabLabel}</Typography>
          {/* Slab details and exception grid here */}
        </>
      ) : null}
    </Box>
  </Drawer>
  ```
- **Why**: Full-featured drill-down UI
- **Impact**: Users can now click "Exceptions" to see slab-specific exceptions

---

## 🔌 API Endpoint Changes

### **GET /reconciliation/slabs**
- **Status**: No changes (existing endpoint)
- **Purpose**: List all reconciliation slabs
- **Usage**: Retrieves slab data for main table

```http
GET /reconciliation/slabs?channel=BEFTN&status=Review
Response: Array of 4 slabs
```

---

### **GET /reconciliation/exceptions** (ENHANCED)
- **Status**: ✅ New parameter added
- **Previous**: `GET /reconciliation/exceptions?status=Open&source=BEFTN`
- **Now Supports**:
  ```http
  GET /reconciliation/exceptions?slabId=SLAB-2
  GET /reconciliation/exceptions?slabId=SLAB-2&status=Open
  GET /reconciliation/exceptions?slabId=SLAB-2&source=BEFTN&status=Open
  ```

**Response Structure** (same, but includes `slabId`):
```json
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
      "slabId": "SLAB-2"    ← NEW FIELD
    }
  ],
  "count": 1,
  "page": 1,
  "pageSize": 100
}
```

**Backward Compatibility**: ✅ Still works without `slabId` parameter

---

## 🗄️ Database Schema Changes

### **reconciliation_exception table**

**Before**:
```sql
CREATE TABLE reconciliation_exception (
  id VARCHAR(64) PRIMARY KEY,
  ref VARCHAR(128) NOT NULL,
  source VARCHAR(32) NOT NULL,
  detected_at VARCHAR(32) NOT NULL,
  amount VARCHAR(64) NOT NULL,
  reason VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  resolution_note VARCHAR(512),
  created_at TIMESTAMP DEFAULT GETDATE()
);
```

**After**:
```sql
CREATE TABLE reconciliation_exception (
  id VARCHAR(64) PRIMARY KEY,
  ref VARCHAR(128) NOT NULL,
  source VARCHAR(32) NOT NULL,
  detected_at VARCHAR(32) NOT NULL,
  amount VARCHAR(64) NOT NULL,
  reason VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  resolution_note VARCHAR(512),
  slab_id VARCHAR(32),                  -- ← NEW COLUMN
  created_at TIMESTAMP DEFAULT GETDATE()
);
```

**Migration**: Automatic via `spring.jpa.hibernate.ddl-auto: update`

**Data**:
```sql
INSERT INTO reconciliation_exception (id, ref, source, ..., slab_id) 
VALUES 
  ('REX-0001', 'BEFTN-942114', 'BEFTN', ..., 'SLAB-2'),  ← LINKED
  ('REX-0002', 'VOS-118220', 'Vostro', ..., 'SLAB-4'),   ← LINKED
  ('REX-0003', 'PRT-550019', 'Partner', ..., NULL);       ← NOT LINKED
```

---

## 🔄 Integration Call Chain

```
ReconciliationSlabsPage (React) 
   ↓
handleViewExceptions(slab)
   ↓
loadExceptions(slab.id)
   ↓
liveListReconciliationExceptions({ slabId: 'SLAB-2' })
   ↓
apiGet('/reconciliation/exceptions?slabId=SLAB-2')
   ↓
HTTP GET /reconciliation/exceptions?slabId=SLAB-2
   ↓
ReconciliationExceptionsController.list(slabId='SLAB-2')
   ↓
ReconciliationExceptionRepository.findAllByOrderByDetectedAtDesc()
   ↓
SELECT * FROM reconciliation_exception WHERE slab_id = 'SLAB-2'
   ↓
Database returns [REX-0001]
   ↓
Controller converts to JSON with slabId field
   ↓
Frontend receives response
   ↓
setExceptions([REX-0001])
   ↓
DataGrid renders exception in drawer
```

---

## 🏗️ Component Dependencies

```
ReconciliationSlabsPage
├── imports ReconciliationSlabDto (type)
├── imports ReconciliationExceptionDto (type)
├── imports liveListReconciliationSlabs (API)
├── imports liveListReconciliationExceptions (API) ← NEW
├── imports Drawer, Button, DataGrid (MUI)
└── useLiveApi hook

ReconciliationExceptionDto
├── used by ReconciliationSlabsPage
├── matches ReconciliationExceptionEntity (Java)
└── includes new slabId field

ReconciliationExceptionEntity
├── used by ReconciliationExceptionRepository (JPA)
├── used by ReconciliationExceptionsController
├── used by ReconciliationExceptionsDataSeed
└── includes new slabId field
```

---

## 🧪 Quick Test Checklist

```
☐ Frontend builds:       npm run build
☐ Frontend lints:        npm run lint  
☐ Types check:           tsc --noEmit
☐ Backend compiles:      mvn clean compile (requires Maven)
☐ Database migrates:     Automatic on app start
☐ API /slabs works:      curl http://localhost:4000/reconciliation/slabs
☐ API /exceptions works: curl http://localhost:4000/reconciliation/exceptions
☐ API ?slabId works:     curl "http://localhost:4000/reconciliation/exceptions?slabId=SLAB-2"
☐ Page loads:            http://localhost:5173/reconciliation/slabs
☐ Button appears:        "View Exceptions" on each slab row
☐ Drawer opens:          Click button → drawer slides in
☐ Exceptions load:       Drawer shows linked exceptions
☐ Error handling:        Stop backend → page shows fallback data
```

---

## 📝 Search Terms for Finding Changes

| Change | Search For |
|--------|-----------|
| New slab_id field | `@Column(name = "slab_id"` |
| New API parameter | `@RequestParam.*slabId` |
| Drawer component | `<Drawer anchor="right"` |
| Exception button | `"View Exceptions"` or `OpenInNewIcon` |
| Drill-down logic | `handleViewExceptions\|loadExceptions` |
| Filter logic | `.filter.*slabId` |
| Type definition | `export type ReconciliationExceptionDto` |

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Column not created | Ensure `ddl-auto: update` in application.yml |
| Type errors | Run `npm install` to update dependencies |
| Build fails | Check Java version (11+) and Maven availability |
| Drawer doesn't open | Check browser console for errors |
| No exceptions shown | Verify database has seed data with slab links |
| API returns 404 | Check controller `@RequestMapping` path |
| CORS error | Verify backend CORS configuration |

---

## 📦 Deployment Commands

### **Backend**
```bash
cd server/frms-ops-api
mvn clean package
java -jar target/frms-ops-api-0.0.1-SNAPSHOT.jar
```

### **Frontend**
```bash
npm run build
# Output: dist/ folder
# Deploy to Nginx or CDN
```

### **Docker (Recommended)**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 📞 Support References

- **Full Integration Guide**: [FULL_STACK_INTEGRATION.md](FULL_STACK_INTEGRATION.md)
- **Testing Procedures**: [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md)
- **Feature Docs**: [RECONCILIATION_SLABS.md](RECONCILIATION_SLABS.md)
- **Status**: [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)

---

**Last Updated**: March 29, 2026  
**Status**: Integration Complete ✅
