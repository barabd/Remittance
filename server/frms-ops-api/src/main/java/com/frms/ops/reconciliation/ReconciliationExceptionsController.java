package com.frms.ops.reconciliation;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/reconciliation/exceptions")
public class ReconciliationExceptionsController {

  private final ReconciliationExceptionRepository repo;

  public ReconciliationExceptionsController(ReconciliationExceptionRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String source,
      @RequestParam(required = false) String slabId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "100") int pageSize) {
    String st = status == null ? "" : status.trim();
    String src = source == null ? "" : source.trim();
    String sb = slabId == null ? "" : slabId.trim();
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);

    Stream<ReconciliationExceptionEntity> s = repo.findAllByOrderByDetectedAtDesc().stream();
    if (!st.isEmpty()) {
      s = s.filter(r -> st.equalsIgnoreCase(r.getStatus()));
    }
    if (!src.isEmpty()) {
      s = s.filter(r -> src.equalsIgnoreCase(r.getSource()));
    }
    if (!sb.isEmpty()) {
      s = s.filter(r -> sb.equalsIgnoreCase(safe(r.getSlabId())));
    }
    if (!qq.isEmpty()) {
      s =
          s.filter(
              r ->
                  contains(r.getRef(), qq)
                      || contains(r.getReason(), qq)
                      || contains(r.getAmount(), qq)
                      || contains(r.getSource(), qq));
    }

    List<ReconciliationExceptionEntity> all = s.toList();
    int p = Math.max(page, 1);
    int ps = Math.min(Math.max(pageSize, 1), 200);
    int fromIdx = (p - 1) * ps;
    int toIdx = Math.min(fromIdx + ps, all.size());
    List<Map<String, Object>> slice =
        fromIdx >= all.size()
            ? List.of()
            : all.subList(fromIdx, toIdx).stream().map(ReconciliationExceptionsController::toJson).toList();
    return new PageDto<>(slice, all.size(), p, ps);
  }

  @PostMapping("/{id}/resolve")
  public Map<String, Object> resolve(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var row =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reconciliation exception not found"));
    if ("Resolved".equalsIgnoreCase(row.getStatus())) {
      return toJson(row);
    }
    row.setStatus("Resolved");
    if (body != null && body.containsKey("resolutionNote")) {
      Object note = body.get("resolutionNote");
      row.setResolutionNote(note == null ? null : String.valueOf(note).trim());
    }
    return toJson(repo.save(row));
  }

  private static boolean contains(String field, String q) {
    return field != null && field.toLowerCase(Locale.ROOT).contains(q);
  }

  private static String safe(String s) {
    return s == null ? "" : s;
  }

  static Map<String, Object> toJson(ReconciliationExceptionEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("ref", e.getRef());
    m.put("source", e.getSource());
    m.put("detectedAt", e.getDetectedAt());
    m.put("amount", e.getAmount());
    m.put("reason", e.getReason());
    m.put("status", e.getStatus());
    if (e.getSlabId() != null && !e.getSlabId().isBlank()) {
      m.put("slabId", e.getSlabId());
    }
    if (e.getResolutionNote() != null && !e.getResolutionNote().isBlank()) {
      m.put("resolutionNote", e.getResolutionNote());
    }
    return m;
  }
}
