package com.frms.ops.disbursement;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Distribution / disbursement worklist — BEFTN/RTGS/NPSB/MFS (#36), branch vs sub-branch (#37), maker-checker + audit.
 * Dashboard: {@code RemittanceDisbursementPage} + {@code /disbursements}.
 */
@RestController
@RequestMapping("/disbursements")
public class DisbursementController {

  private final DisbursementItemRepository itemRepo;
  private final DisbursementAuditRepository auditRepo;

  @Value("${frms.ops.disbursement.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public DisbursementController(
      DisbursementItemRepository itemRepo, DisbursementAuditRepository auditRepo) {
    this.itemRepo = itemRepo;
    this.auditRepo = auditRepo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String channel,
      @RequestParam(required = false) String maker,
      @RequestParam(required = false) String originatingUnit,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "100") int pageSize) {
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    String st = status == null ? "" : status.trim();
    String ch = channel == null ? "" : channel.trim();
    String mk = maker == null ? "" : maker.trim().toLowerCase(Locale.ROOT);
    String ou = originatingUnit == null ? "" : originatingUnit.trim();
    String f = from == null ? "" : from.trim();
    String t = to == null ? "" : to.trim();

    Stream<DisbursementItemEntity> s = itemRepo.findAll().stream();
    if (!qq.isEmpty()) {
      s =
          s.filter(
              r ->
                  contains(r.getRemittanceNo(), qq)
                      || contains(r.getBeneficiary(), qq)
                      || contains(r.getPayoutTo(), qq));
    }
    if (!st.isEmpty()) {
      s = s.filter(r -> st.equals(r.getStatus()));
    }
    if (!ch.isEmpty()) {
      s = s.filter(r -> ch.equalsIgnoreCase(r.getChannel()));
    }
    if (!mk.isEmpty()) {
      s = s.filter(r -> r.getMaker() != null && r.getMaker().toLowerCase(Locale.ROOT).contains(mk));
    }
    if (!ou.isEmpty()) {
      s = s.filter(r -> ou.equals(r.getOriginatingUnit()));
    }
    if (!f.isEmpty()) {
      s = s.filter(r -> r.getCreatedAt() != null && r.getCreatedAt().compareTo(f) >= 0);
    }
    if (!t.isEmpty()) {
      s =
          s.filter(
              r ->
                  r.getCreatedAt() != null
                      && r.getCreatedAt().length() >= 10
                      && r.getCreatedAt().substring(0, 10).compareTo(t) <= 0);
    }

    List<DisbursementItemEntity> all =
        s.sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt())).toList();
    int p = Math.max(page, 1);
    int ps = Math.min(Math.max(pageSize, 1), 200);
    int fromIdx = (p - 1) * ps;
    int toIdx = Math.min(fromIdx + ps, all.size());
    List<Map<String, Object>> slice =
        fromIdx >= all.size()
            ? List.of()
            : all.subList(fromIdx, toIdx).stream().map(DisbursementController::toItemJson).toList();
    return new PageDto<>(slice, all.size(), p, ps);
  }

  @GetMapping("/{id}/audit")
  public Map<String, Object> audit(@PathVariable String id) {
    ensureItem(id);
    List<Map<String, Object>> events =
        auditRepo.findByDisbursementIdOrderByIdAsc(id).stream()
            .map(DisbursementController::toAuditJson)
            .toList();
    return Map.of("events", events);
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var row = loadItem(id);
    if (!"Pending Approval".equals(row.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item is not pending approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && checker.equalsIgnoreCase(row.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    row.setStatus("Approved");
    row.setChecker(checker);
    itemRepo.save(row);
    appendAudit(id, checker, "Approved (maker-checker)", "Payout cleared for rail execution.");
    return toItemJson(row);
  }

  @PostMapping("/{id}/reject")
  public Map<String, Object> reject(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var row = loadItem(id);
    if (!"Pending Approval".equals(row.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item is not pending approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && checker.equalsIgnoreCase(row.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    row.setStatus("Rejected");
    row.setChecker(checker);
    itemRepo.save(row);
    String reason =
        body != null && body.get("reason") != null ? String.valueOf(body.get("reason")) : "";
    appendAudit(
        id,
        checker,
        "Rejected (maker-checker)",
        reason.isEmpty() ? null : "Reason: " + reason);
    return toItemJson(row);
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var row = loadItem(id);
    if (body.containsKey("status")) {
      String next = String.valueOf(body.get("status"));
      if ("On Hold".equals(next)) {
        if (!"Pending Approval".equals(row.getStatus())) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "Hold is only allowed from Pending Approval");
        }
        row.setStatus("On Hold");
        appendAudit(id, defaultChecker, "Placed on hold", "Payout paused pending review.");
      } else if ("Pending Approval".equals(next)) {
        if (!"On Hold".equals(row.getStatus())) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "Release hold is only allowed from On Hold");
        }
        row.setStatus("Pending Approval");
        appendAudit(id, defaultChecker, "Released from hold", "Returned to pending approval queue.");
      } else if ("Queued".equals(next)) {
        if (!"Approved".equals(row.getStatus())) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Queue requires Approved status");
        }
        row.setStatus("Queued");
        appendAudit(id, "Ops", "Queued for payout", row.getChannel() + " rail");
      } else {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Unsupported status via PATCH: " + next);
      }
    }
    if (body.containsKey("payoutRef")) {
      Object v = body.get("payoutRef");
      row.setPayoutRef(v == null || String.valueOf(v).isBlank() ? null : String.valueOf(v).trim());
    }
    return toItemJson(itemRepo.save(row));
  }

  @PostMapping("/{id}/mark-disbursed")
  public Map<String, Object> markDisbursed(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var row = loadItem(id);
    if (!"Approved".equals(row.getStatus()) && !"Queued".equals(row.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Mark disbursed requires Approved or Queued status");
    }
    String ref = null;
    if (body != null && body.get("payoutRef") != null) {
      String s = String.valueOf(body.get("payoutRef")).trim();
      if (!s.isEmpty()) ref = s;
    }
    if (ref == null || ref.isEmpty()) {
      ref = row.getChannel() + "-" + (100000 + (int) (Math.random() * 899999));
    }
    row.setPayoutRef(ref);
    row.setStatus("Disbursed");
    itemRepo.save(row);
    appendAudit(id, "Ops", "Marked disbursed", "Payout ref " + ref);
    return toItemJson(row);
  }

  private void ensureItem(String id) {
    if (!itemRepo.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Disbursement item not found");
    }
  }

  private DisbursementItemEntity loadItem(String id) {
    return itemRepo
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Disbursement item not found"));
  }

  private String resolveChecker(Map<String, Object> body) {
    if (body == null || !body.containsKey("checkerUser")) {
      return defaultChecker;
    }
    Object v = body.get("checkerUser");
    String s = v == null ? "" : String.valueOf(v).trim();
    return s.isEmpty() ? defaultChecker : s;
  }

  private void appendAudit(String disbursementId, String actor, String action, String details) {
    var a = new DisbursementAuditEntity();
    a.setDisbursementId(disbursementId);
    a.setAtTs(nowTs());
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static boolean contains(String field, String qq) {
    return field != null && field.toLowerCase(Locale.ROOT).contains(qq);
  }

  private static Map<String, Object> toItemJson(DisbursementItemEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("remittanceNo", e.getRemittanceNo());
    m.put("createdAt", e.getCreatedAt());
    m.put("corridor", e.getCorridor());
    m.put("channel", e.getChannel());
    m.put("payoutTo", e.getPayoutTo());
    if (e.getPayoutRef() != null) m.put("payoutRef", e.getPayoutRef());
    m.put("beneficiary", e.getBeneficiary());
    m.put("amountBDT", e.getAmountBdt());
    m.put("maker", e.getMaker());
    if (e.getChecker() != null) m.put("checker", e.getChecker());
    m.put("status", e.getStatus());
    m.put("originatingUnit", e.getOriginatingUnit());
    return m;
  }

  private static Map<String, Object> toAuditJson(DisbursementAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    if (e.getDetails() != null) m.put("details", e.getDetails());
    return m;
  }
}
