package com.frms.ops.bulk;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Audit trail for spreadsheet previews logged from the dashboard {@code /operations/bulk-data-hub}. Persists to table
 * {@code bulk_hub_event} (see repo file {@code database/mssql/bulk_hub_log.sql}). Frontend merge layer: {@code
 * src/integrations/bulkDataHub/bulkHubRepository.ts} and {@code src/state/bulkHubStore.ts}. Full row ingestion remains on
 * target UIs.
 */
@RestController
@RequestMapping("/bulk-hub/events")
public class BulkHubEventController {

  private final BulkHubEventRepository repo;

  public BulkHubEventController(BulkHubEventRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list() {
    var items =
        repo.findAll().stream()
            .sorted((a, b) -> b.getRecordedAt().compareTo(a.getRecordedAt()))
            .map(BulkHubEventController::toJson)
            .toList();
    return PageDto.of(items);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new BulkHubEventEntity();
    e.setId("BHE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    putStr(e::setTarget, body, "target");
    putStr(e::setFileName, body, "fileName");
    if (body.containsKey("sheetName")) {
      Object s = body.get("sheetName");
      e.setSheetName(s == null || String.valueOf(s).isBlank() ? null : String.valueOf(s));
    }
    putStr(e::setRecordedAt, body, "recordedAt");
    if (e.getRecordedAt() == null || e.getRecordedAt().isBlank()) {
      e.setRecordedAt(nowTs());
    }
    if (body.containsKey("rowCount")) {
      Object r = body.get("rowCount");
      e.setRowCount(r instanceof Number ? ((Number) r).intValue() : Integer.parseInt(String.valueOf(r)));
    } else {
      e.setRowCount(0);
    }
    if (body.containsKey("columnCount")) {
      Object c = body.get("columnCount");
      e.setColumnCount(c instanceof Number ? ((Number) c).intValue() : Integer.parseInt(String.valueOf(c)));
    } else {
      e.setColumnCount(0);
    }
    if (e.getTarget() == null || e.getTarget().isBlank()) e.setTarget("unknown");
    if (e.getFileName() == null) e.setFileName("");
    return toJson(repo.save(e));
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static void putStr(java.util.function.Consumer<String> c, Map<String, Object> body, String k) {
    if (!body.containsKey(k)) return;
    Object v = body.get(k);
    c.accept(v == null ? null : String.valueOf(v));
  }

  private static Map<String, Object> toJson(BulkHubEventEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("target", e.getTarget());
    m.put("fileName", e.getFileName());
    m.put("rowCount", e.getRowCount());
    m.put("columnCount", e.getColumnCount());
    if (e.getSheetName() != null) m.put("sheetName", e.getSheetName());
    m.put("recordedAt", e.getRecordedAt());
    return m;
  }
}
