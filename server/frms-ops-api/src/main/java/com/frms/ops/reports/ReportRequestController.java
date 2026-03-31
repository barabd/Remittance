package com.frms.ops.reports;

import com.frms.ops.api.dto.PageDto;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/reports")
public class ReportRequestController {

  private static final Set<String> VALID_STATUS =
      Set.of("Draft", "Generated", "Pending Approval", "Approved", "Rejected");

  private final ReportRequestRepository repo;
  private final ReportRequestAuditRepository auditRepo;

  public ReportRequestController(ReportRequestRepository repo, ReportRequestAuditRepository auditRepo) {
    this.repo = repo;
    this.auditRepo = auditRepo;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public PageDto<Map<String, Object>> list() {
    return PageDto.of(repo.findAllByOrderByGeneratedAtDescIdDesc().stream().map(this::toJson).toList());
  }

  @GetMapping("/{id}/audit")
  @Transactional(readOnly = true)
  public Map<String, Object> audit(@PathVariable String id) {
    if (!repo.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found: " + id);
    }
    var events = auditRepo.findByReportIdOrderByIdAsc(id).stream().map(this::toAuditJson).toList();
    return Map.of("events", events);
  }

  @PostMapping
  @Transactional
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    String reportName = req(body, "reportName");
    String periodFrom = req(body, "periodFrom");
    String periodTo = req(body, "periodTo");
    String branchScope = req(body, "branchScope");
    String maker = req(body, "maker");
    int rowCount = nonNegInt(body.get("rowCount"), "rowCount");
    String id = nextId();

    var e = new ReportRequestEntity();
    e.setId(id);
    e.setReportName(reportName);
    e.setGeneratedAt(nowTs());
    e.setPeriodFrom(periodFrom);
    e.setPeriodTo(periodTo);
    e.setBranchScope(branchScope);
    e.setRowCount(rowCount);
    e.setMaker(maker);
    e.setChecker(null);
    e.setStatus("Pending Approval");
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    e.setCreatedAt(now);
    e.setUpdatedAt(now);

    var saved = repo.save(e);
    appendAudit(saved.getId(), saved.getMaker(), "Generated report", saved.getReportName() + " · " + saved.getPeriodFrom() + " → " + saved.getPeriodTo());
    appendAudit(saved.getId(), "System", "Queued for maker-checker approval", null);
    return toJson(saved);
  }

  @PostMapping("/{id}/approve")
  @Transactional
  public Map<String, Object> approve(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Pending Approval".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending reports can be approved");
    }
    String checker = checkerUser(body);
    if (checker.equalsIgnoreCase(safe(e.getMaker()))) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Checker cannot be the same as maker");
    }
    e.setStatus("Approved");
    e.setChecker(checker);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    var saved = repo.save(e);
    appendAudit(saved.getId(), checker, "Approved", null);
    return toJson(saved);
  }

  @PostMapping("/{id}/reject")
  @Transactional
  public Map<String, Object> reject(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Pending Approval".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending reports can be rejected");
    }
    String checker = checkerUser(body);
    if (checker.equalsIgnoreCase(safe(e.getMaker()))) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Checker cannot be the same as maker");
    }
    e.setStatus("Rejected");
    e.setChecker(checker);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    var saved = repo.save(e);
    String reason = body == null ? "" : safe(body.get("reason"));
    appendAudit(saved.getId(), checker, "Rejected", reason.isBlank() ? null : "Reason: " + reason);
    return toJson(saved);
  }

  @PostMapping("/{id}/status")
  @Transactional
  public Map<String, Object> setStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e = findOrThrow(id);
    String status = req(body, "status");
    if (!VALID_STATUS.contains(status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status);
    }
    e.setStatus(status);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    if (body.containsKey("checker")) {
      String checker = safe(body.get("checker"));
      e.setChecker(checker.isBlank() ? null : checker);
    }
    var saved = repo.save(e);
    appendAudit(saved.getId(), "System", "Status updated", status);
    return toJson(saved);
  }

  private ReportRequestEntity findOrThrow(String id) {
    return repo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found: " + id));
  }

  private Map<String, Object> toJson(ReportRequestEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("reportName", e.getReportName());
    m.put("generatedAt", e.getGeneratedAt());
    m.put("periodFrom", e.getPeriodFrom());
    m.put("periodTo", e.getPeriodTo());
    m.put("branchScope", e.getBranchScope());
    m.put("rowCount", e.getRowCount());
    m.put("maker", e.getMaker());
    m.put("checker", e.getChecker());
    m.put("status", e.getStatus());
    return m;
  }

  private Map<String, Object> toAuditJson(ReportRequestAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    m.put("details", e.getDetails());
    return m;
  }

  private void appendAudit(String reportId, String actor, String action, String details) {
    var a = new ReportRequestAuditEntity();
    a.setReportId(reportId);
    a.setAtTs(nowTs());
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static String checkerUser(Map<String, Object> body) {
    String c = body == null ? "" : safe(body.get("checkerUser"));
    return c.isBlank() ? "HO-Admin" : c;
  }

  private static int nonNegInt(Object o, String field) {
    if (o == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    int v;
    if (o instanceof Number n) {
      v = n.intValue();
    } else {
      try {
        v = Integer.parseInt(String.valueOf(o).trim());
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be integer");
      }
    }
    if (v < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0");
    return v;
  }

  private static String req(Map<String, Object> body, String field) {
    String v = safe(body.get(field));
    if (v.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    return v;
  }

  private static String safe(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static String nowTs() {
    return LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static String nextId() {
    var now = LocalDateTime.now();
    return String.format(
        Locale.ROOT,
        "RPT-%d-%06d",
        now.getYear(),
        Math.abs((int) (System.nanoTime() % 1_000_000)));
  }
}
