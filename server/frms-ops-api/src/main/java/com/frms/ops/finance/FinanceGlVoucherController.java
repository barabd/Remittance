package com.frms.ops.finance;

import com.frms.ops.api.dto.PageDto;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Finance General Ledger — voucher lifecycle.
 *
 * <ul>
 *   <li>{@code GET  /finance/gl-vouchers} — list with optional filters</li>
 *   <li>{@code POST /finance/gl-vouchers} — create (status = Draft)</li>
 *   <li>{@code POST /finance/gl-vouchers/{id}/submit}</li>
 *   <li>{@code POST /finance/gl-vouchers/{id}/approve}</li>
 *   <li>{@code POST /finance/gl-vouchers/{id}/reject}</li>
 *   <li>{@code POST /finance/gl-vouchers/{id}/post}</li>
 *   <li>{@code POST /finance/gl-vouchers/{id}/hold}</li>
 * </ul>
 */
@RestController
@RequestMapping("/finance/gl-vouchers")
public class FinanceGlVoucherController {

  private static final Set<String> VALID_TYPES   = Set.of("Cash", "Bank", "Journal", "Petty");
  private static final Set<String> VALID_STATUSES =
      Set.of("Draft", "Pending Approval", "Approved", "Posted", "Rejected", "On Hold");

  private final FinanceGlVoucherRepository repo;
  private final FinanceGlVoucherAuditRepository auditRepo;

  public FinanceGlVoucherController(
      FinanceGlVoucherRepository repo, FinanceGlVoucherAuditRepository auditRepo) {
    this.repo = repo;
    this.auditRepo = auditRepo;
  }

  // ── List ─────────────────────────────────────────────────────────────────

  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String type,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String branch,
      @RequestParam(required = false) String fromDate,
      @RequestParam(required = false) String toDate) {

    String qq     = q      == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    String typeF  = type   == null ? "" : type.trim();
    String statF  = status == null ? "" : status.trim();
    String branchF = branch == null ? "" : branch.trim().toLowerCase(Locale.ROOT);

    LocalDate from = parseDate(fromDate);
    LocalDate to   = parseDate(toDate);

    var items =
        repo.findAllByOrderByVoucherDateDescIdDesc().stream()
            .filter(e -> typeF.isEmpty()  || typeF.equalsIgnoreCase(e.getType()))
            .filter(e -> statF.isEmpty()  || statF.equalsIgnoreCase(e.getStatus()))
            .filter(e -> branchF.isEmpty() || safe(e.getBranch()).toLowerCase(Locale.ROOT).contains(branchF))
            .filter(e -> from == null || !parseDate(e.getVoucherDate()).isBefore(from))
            .filter(e -> to   == null || !parseDate(e.getVoucherDate()).isAfter(to))
            .filter(e -> qq.isEmpty() ||
                safe(e.getVoucherNo()).toLowerCase(Locale.ROOT).contains(qq) ||
                safe(e.getNarration()).toLowerCase(Locale.ROOT).contains(qq) ||
                safe(e.getMaker()).toLowerCase(Locale.ROOT).contains(qq))
            .map(FinanceGlVoucherController::toJson)
            .toList();

    return PageDto.of(items);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @PostMapping
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    String voucherNo = safe(str(body.get("voucherNo"))).trim();
    if (voucherNo.isEmpty()) {
      voucherNo = nextId("VCH");
    }
    var e = new FinanceGlVoucherEntity();
    e.setId(repo.existsById(voucherNo) ? nextId("VCH") : voucherNo);
    e.setVoucherNo(voucherNo);
    e.setVoucherDate(safe(str(body.get("voucherDate"))).trim().isEmpty()
        ? LocalDate.now().toString() : str(body.get("voucherDate")));
    String t = type(body.get("type"));
    e.setType(t);
    e.setNarration(safe(str(body.get("narration"))).trim().isEmpty() ? "-" : str(body.get("narration")).trim());
    e.setDebit(dbl(body.get("debit")));
    e.setCredit(dbl(body.get("credit")));
    e.setVatAmount(dbl(body.get("vatAmount")));
    e.setBranch(safe(str(body.get("branch"))).trim().isEmpty() ? "Head Office" : str(body.get("branch")).trim());
    String maker = safe(str(body.get("maker"))).trim();
    if (maker.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maker is required");
    e.setMaker(maker);
    e.setChecker(str(body.get("checker")));
    e.setStatus("Draft");
    var saved = repo.save(e);
    appendAudit(
        saved.getId(),
        saved.getMaker(),
        "Created voucher",
        ""
            + saved.getType()
            + " · Dr "
            + String.format(Locale.ROOT, "%.2f", saved.getDebit())
            + " / Cr "
            + String.format(Locale.ROOT, "%.2f", saved.getCredit()));
    return toJson(saved);
  }

  // ── Status transitions ────────────────────────────────────────────────────

  @GetMapping("/{id}/audit")
  public Map<String, Object> audit(@PathVariable String id) {
    findOrThrow(id);
    var events =
        auditRepo.findByVoucherIdOrderByIdAsc(id).stream()
            .map(FinanceGlVoucherController::toAuditJson)
            .toList();
    return Map.of("events", events);
  }

  @PostMapping("/{id}/submit")
  public Map<String, Object> submit(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Draft".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only Draft vouchers can be submitted");
    }
    e.setStatus("Pending Approval");
    e.setChecker(null);
    var saved = repo.save(e);
    appendAudit(saved.getId(), "System", "Queued for maker-checker approval", null);
    return toJson(saved);
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Pending Approval".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher is not pending approval");
    }
    String checker = checkerUser(body);
    if (checker.equalsIgnoreCase(safe(e.getMaker()).trim())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Checker cannot be the same as maker (maker-checker separation)");
    }
    e.setStatus("Approved");
    e.setChecker(checker);
    var saved = repo.save(e);
    appendAudit(saved.getId(), checker, "Approved", null);
    return toJson(saved);
  }

  @PostMapping("/{id}/reject")
  public Map<String, Object> reject(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Pending Approval".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher is not pending approval");
    }
    String checker = checkerUser(body);
    if (checker.equalsIgnoreCase(safe(e.getMaker()).trim())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Checker cannot be the same as maker (maker-checker separation)");
    }
    e.setStatus("Rejected");
    e.setChecker(checker);
    var saved = repo.save(e);
    String reason = body == null ? "" : safe(str(body.get("reason"))).trim();
    appendAudit(saved.getId(), checker, "Rejected", reason.isEmpty() ? null : "Reason: " + reason);
    return toJson(saved);
  }

  @PostMapping("/{id}/post")
  public Map<String, Object> post(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Approved".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher must be Approved before posting");
    }
    String checker = checkerUser(body);
    e.setStatus("Posted");
    e.setChecker(checker);
    var saved = repo.save(e);
    appendAudit(saved.getId(), checker, "Posted to ledger", null);
    return toJson(saved);
  }

  @PostMapping("/{id}/hold")
  public Map<String, Object> hold(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e = findOrThrow(id);
    if (!"Pending Approval".equals(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher is not pending approval");
    }
    e.setStatus("On Hold");
    var saved = repo.save(e);
    appendAudit(saved.getId(), checkerUser(body), "Placed on hold", null);
    return toJson(saved);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private FinanceGlVoucherEntity findOrThrow(String id) {
    return repo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found: " + id));
  }

  private static String checkerUser(Map<String, Object> body) {
    if (body == null) return "Finance-Checker";
    String u = safe(str(body.get("checkerUser"))).trim();
    return u.isEmpty() ? "Finance-Checker" : u;
  }

  private static String type(Object o) {
    String v = safe(str(o)).trim();
    return VALID_TYPES.contains(v) ? v : "Journal";
  }

  private static double dbl(Object o) {
    if (o instanceof Number n) return n.doubleValue();
    try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 0; }
  }

  private static LocalDate parseDate(String s) {
    if (s == null || s.isBlank()) return null;
    try { return LocalDate.parse(s.trim().substring(0, 10)); } catch (Exception e) { return null; }
  }

  private static String str(Object o) { return o == null ? null : String.valueOf(o); }
  private static String safe(String s) { return s == null ? "" : s; }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private void appendAudit(String voucherId, String actor, String action, String details) {
    var e = new FinanceGlVoucherAuditEntity();
    e.setVoucherId(voucherId);
    e.setAtTs(nowTs());
    e.setActor(safe(actor).isBlank() ? "System" : actor);
    e.setAction(action);
    e.setDetails(details);
    auditRepo.save(e);
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  static Map<String, Object> toJson(FinanceGlVoucherEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id",          e.getId());
    m.put("voucherNo",   e.getVoucherNo());
    m.put("voucherDate", e.getVoucherDate());
    m.put("type",        e.getType());
    m.put("narration",   e.getNarration());
    m.put("debit",       e.getDebit());
    m.put("credit",      e.getCredit());
    m.put("vatAmount",   e.getVatAmount());
    m.put("branch",      e.getBranch());
    m.put("maker",       e.getMaker());
    m.put("checker",     e.getChecker());
    m.put("status",      e.getStatus());
    return m;
  }

  private static Map<String, Object> toAuditJson(FinanceGlVoucherAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    if (e.getDetails() != null && !e.getDetails().isBlank()) {
      m.put("details", e.getDetails());
    }
    return m;
  }
}
