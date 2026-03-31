package com.frms.ops.masters.beneficiary;

import com.frms.ops.api.dto.PageDto;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/beneficiaries")
public class BeneficiaryController {

  private final BeneficiaryRepository repo;
  private final BeneficiaryAuditRepository auditRepo;

  @Value("${frms.ops.masters.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public BeneficiaryController(BeneficiaryRepository repo, BeneficiaryAuditRepository auditRepo) {
    this.repo = repo;
    this.auditRepo = auditRepo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(@RequestParam(required = false) String q) {
    String qq = q == null ? "" : q.trim().toLowerCase();
    List<BeneficiaryEntity> list =
        repo.findAll().stream()
            .filter(
                b ->
                    qq.isEmpty()
                        || (b.getFullName() != null && b.getFullName().toLowerCase().contains(qq))
                        || (b.getPhone() != null && b.getPhone().toLowerCase().contains(qq)))
            .toList();
    return PageDto.of(list.stream().map(BeneficiaryController::toJson).toList());
  }

  @GetMapping("/{id}/audit")
  public Map<String, Object> audit(@PathVariable String id) {
    ensureExists(id);
    List<Map<String, Object>> events =
        auditRepo.findByBeneficiaryIdOrderByIdAsc(id).stream()
            .map(BeneficiaryController::toAuditJson)
            .toList();
    return Map.of("events", events);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new BeneficiaryEntity();
    e.setId("BEN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    applyBody(e, body, true);
    if (e.getStatus() == null || e.getStatus().isBlank()) {
      e.setStatus("Pending Approval");
    }
    if (e.getMaker() == null || e.getMaker().isBlank()) {
      e.setMaker("HO-Maker");
    }
    if (e.getCreatedAt() == null || e.getCreatedAt().isBlank()) {
      e.setCreatedAt(nowTs());
    }
    repo.save(e);
    appendAudit(
        e.getId(),
        e.getMaker(),
        "Registered (pending approval)",
        "Payout beneficiary submitted for maker-checker review.");
    return toJson(e);
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found"));
    String oldStatus = e.getStatus();
    applyBody(e, body, false);
    String newStatus = e.getStatus();

    if (body.containsKey("status") && !Objects.equals(oldStatus, newStatus)) {
      if ("On Hold".equals(newStatus) && "Pending Approval".equals(oldStatus)) {
        appendAudit(
            id,
            defaultChecker,
            "Placed on hold",
            "Maker-checker review paused.");
      } else if ("Pending Approval".equals(newStatus) && "On Hold".equals(oldStatus)) {
        appendAudit(
            id,
            defaultChecker,
            "Released from hold",
            "Returned to pending approval queue.");
      } else if ("Rejected".equals(newStatus)) {
        String actor = e.getChecker() != null ? e.getChecker() : defaultChecker;
        appendAudit(id, actor, "Rejected (maker-checker)", "Record not approved for active payouts.");
      }
    } else if (!body.isEmpty()) {
      String keys = String.join(", ", body.keySet());
      appendAudit(
          id,
          e.getMaker() != null ? e.getMaker() : "System",
          "Beneficiary record updated",
          keys.length() > 200 ? keys.substring(0, 200) + "…" : keys);
    }

    return toJson(repo.save(e));
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found"));
    if (!"Pending Approval".equals(e.getStatus()) && !"On Hold".equals(e.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Beneficiary is not awaiting checker approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && e.getMaker() != null && checker.equalsIgnoreCase(e.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    e.setStatus("Active");
    e.setChecker(checker);
    repo.save(e);
    appendAudit(
        id,
        checker,
        "Approved (maker-checker)",
        "Beneficiary cleared for payout use (Active).");
    return toJson(e);
  }

  @PostMapping("/{id}/reject")
  public Map<String, Object> reject(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found"));
    if (!"Pending Approval".equals(e.getStatus()) && !"On Hold".equals(e.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Beneficiary is not awaiting checker decision");
    }
    String checker = resolveChecker(body);
    if (checker != null && e.getMaker() != null && checker.equalsIgnoreCase(e.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    e.setStatus("Rejected");
    e.setChecker(checker);
    repo.save(e);
    String reason =
        body != null && body.get("reason") != null ? String.valueOf(body.get("reason")) : "";
    appendAudit(
        id,
        checker,
        "Rejected (maker-checker)",
        reason.isBlank() ? null : "Reason: " + reason);
    return toJson(e);
  }

  private void ensureExists(String id) {
    if (!repo.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary not found");
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

  private void appendAudit(String beneficiaryId, String actor, String action, String details) {
    var a = new BeneficiaryAuditEntity();
    a.setBeneficiaryId(beneficiaryId);
    a.setAtTs(nowTs());
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static void applyBody(BeneficiaryEntity e, Map<String, Object> body, boolean create) {
    putStr(e::setFullName, body, "fullName");
    putStr(e::setPhone, body, "phone");
    putStr(e::setIdDocumentRef, body, "idDocumentRef");
    putStr(e::setBankName, body, "bankName");
    putStr(e::setBankAccountMasked, body, "bankAccountMasked");
    putStr(e::setBranch, body, "branch");
    putStr(e::setStatus, body, "status");
    putStr(e::setMaker, body, "maker");
    putStr(e::setChecker, body, "checker");
    putStr(e::setCreatedAt, body, "createdAt");
    putStr(e::setNotes, body, "notes");
  }

  private static void putStr(java.util.function.Consumer<String> setter, Map<String, Object> body, String key) {
    if (!body.containsKey(key)) return;
    Object v = body.get(key);
    setter.accept(v == null ? null : String.valueOf(v));
  }

  private static Map<String, Object> toJson(BeneficiaryEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("fullName", e.getFullName());
    m.put("phone", e.getPhone());
    m.put("idDocumentRef", e.getIdDocumentRef());
    m.put("bankName", e.getBankName());
    m.put("bankAccountMasked", e.getBankAccountMasked());
    m.put("branch", e.getBranch());
    m.put("status", e.getStatus());
    m.put("maker", e.getMaker());
    if (e.getChecker() != null) {
      m.put("checker", e.getChecker());
    }
    m.put("createdAt", e.getCreatedAt());
    if (e.getNotes() != null) {
      m.put("notes", e.getNotes());
    }
    return m;
  }

  private static Map<String, Object> toAuditJson(BeneficiaryAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    if (e.getDetails() != null) {
      m.put("details", e.getDetails());
    }
    return m;
  }
}
