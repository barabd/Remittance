package com.frms.ops.masters.cover;

import com.frms.ops.api.dto.PageDto;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cover-funds")
public class CoverFundController {

  private final CoverFundRepository repo;
  private final CoverFundAuditRepository auditRepo;

  @Value("${frms.ops.masters.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public CoverFundController(CoverFundRepository repo, CoverFundAuditRepository auditRepo) {
    this.repo = repo;
    this.auditRepo = auditRepo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list() {
    return PageDto.of(repo.findAll().stream().map(CoverFundController::toJson).toList());
  }

  @GetMapping("/{id}/audit")
  public Map<String, Object> audit(@PathVariable String id) {
    ensureExists(id);
    List<Map<String, Object>> events =
        auditRepo.findByCoverFundIdOrderByIdAsc(id).stream()
            .map(CoverFundController::toAuditJson)
            .toList();
    return Map.of("events", events);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new CoverFundEntity();
    e.setId("CF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    apply(e, body);
    if (e.getStatus() == null || e.getStatus().isBlank()) e.setStatus("Pending Approval");
    if (e.getMaker() == null || e.getMaker().isBlank()) e.setMaker("HO-Maker");
    if (e.getBalanceAmount() == null) e.setBalanceAmount(BigDecimal.ZERO);
    if (e.getUpdatedAt() == null || e.getUpdatedAt().isBlank()) {
      e.setUpdatedAt(java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16));
    }
    var saved = repo.save(e);
    appendAudit(
        saved.getId(),
        saved.getMaker(),
        "Created cover fund (pending approval)",
        saved.getPartnerName() + " " + saved.getCurrency());
    return toJson(saved);
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cover fund not found"));
    String oldStatus = e.getStatus();
    BigDecimal oldBalance = e.getBalanceAmount();
    String oldPartner = e.getPartnerName();
    apply(e, body);

    boolean balanceChanged = body.containsKey("balanceAmount") && !Objects.equals(oldBalance, e.getBalanceAmount());
    boolean partnerChanged = body.containsKey("partnerName") && !Objects.equals(oldPartner, e.getPartnerName());
    if ("Active".equals(oldStatus) && (balanceChanged || partnerChanged)) {
      e.setStatus("Pending Approval");
      e.setChecker(null);
      if (e.getMaker() == null || e.getMaker().isBlank()) {
        e.setMaker("HO-Maker");
      }
      appendAudit(
          id,
          e.getMaker(),
          "Cover fund updated (re-approval required)",
          (balanceChanged ? "Balance changed. " : "")
              + (partnerChanged ? "Partner changed." : ""));
    } else if (body.containsKey("status") && !Objects.equals(oldStatus, e.getStatus())) {
      if ("On Hold".equals(e.getStatus()) && "Pending Approval".equals(oldStatus)) {
        appendAudit(id, defaultChecker, "Placed on hold", "Cover fund review paused.");
      } else if ("Pending Approval".equals(e.getStatus()) && "On Hold".equals(oldStatus)) {
        appendAudit(id, defaultChecker, "Released from hold", "Returned to pending approval queue.");
      } else if ("Rejected".equals(e.getStatus())) {
        appendAudit(id, defaultChecker, "Rejected (maker-checker)", null);
      }
    } else if (!body.isEmpty()) {
      String keys = String.join(", ", body.keySet());
      appendAudit(
          id,
          e.getMaker() != null ? e.getMaker() : "System",
          "Cover fund record updated",
          keys.length() > 200 ? keys.substring(0, 200) + "..." : keys);
    }

    e.setUpdatedAt(java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16));
    return toJson(repo.save(e));
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cover fund not found"));
    if (!"Pending Approval".equals(e.getStatus()) && !"On Hold".equals(e.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Cover fund is not awaiting checker approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && e.getMaker() != null && checker.equalsIgnoreCase(e.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker-checker separation)");
    }
    e.setStatus("Active");
    e.setChecker(checker);
    var saved = repo.save(e);
    appendAudit(saved.getId(), checker, "Approved (maker-checker)", "Cover position is now Active.");
    return toJson(saved);
  }

  private void ensureExists(String id) {
    if (!repo.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cover fund not found");
    }
  }

  private String resolveChecker(Map<String, Object> body) {
    if (body == null || !body.containsKey("checkerUser")) {
      return defaultChecker;
    }
    Object v = body.get("checkerUser");
    String s = v == null ? "" : String.valueOf(v).trim();
    return s.isEmpty() ? defaultChecker : s;
  }

  private void appendAudit(String coverFundId, String actor, String action, String details) {
    var a = new CoverFundAuditEntity();
    a.setCoverFundId(coverFundId);
    a.setAtTs(nowTs());
    a.setActor(actor == null || actor.isBlank() ? "System" : actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static void apply(CoverFundEntity e, Map<String, Object> body) {
    putStr(e::setFundCode, body, "fundCode");
    putStr(e::setPartnerName, body, "partnerName");
    putStr(e::setCurrency, body, "currency");
    putStr(e::setStatus, body, "status");
    putStr(e::setMaker, body, "maker");
    putStr(e::setChecker, body, "checker");
    putStr(e::setUpdatedAt, body, "updatedAt");
    putStr(e::setNotes, body, "notes");
    if (body.containsKey("balanceAmount")) {
      Object v = body.get("balanceAmount");
      if (v instanceof Number n) {
        e.setBalanceAmount(BigDecimal.valueOf(n.doubleValue()));
      } else if (v != null) {
        e.setBalanceAmount(new BigDecimal(String.valueOf(v)));
      }
    }
  }

  private static void putStr(java.util.function.Consumer<String> c, Map<String, Object> body, String k) {
    if (!body.containsKey(k)) return;
    Object v = body.get(k);
    c.accept(v == null ? null : String.valueOf(v));
  }

  private static Map<String, Object> toJson(CoverFundEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("fundCode", e.getFundCode());
    m.put("partnerName", e.getPartnerName());
    m.put("currency", e.getCurrency());
    m.put("balanceAmount", e.getBalanceAmount().doubleValue());
    m.put("status", e.getStatus());
    m.put("maker", e.getMaker());
    if (e.getChecker() != null) m.put("checker", e.getChecker());
    m.put("updatedAt", e.getUpdatedAt());
    if (e.getNotes() != null) m.put("notes", e.getNotes());
    return m;
  }

  private static Map<String, Object> toAuditJson(CoverFundAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    if (e.getDetails() != null) m.put("details", e.getDetails());
    return m;
  }
}
