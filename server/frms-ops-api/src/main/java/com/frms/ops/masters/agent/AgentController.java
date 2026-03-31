package com.frms.ops.masters.agent;

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

/**
 * A.1.4 #9 — Exchange houses and correspondent agents: CRUD + maker-checker + audit trail. Table {@code masters_agent}.
 */
@RestController
@RequestMapping("/agents")
public class AgentController {

  private final AgentRepository repo;
  private final AgentAuditRepository auditRepo;

  @Value("${frms.ops.masters.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public AgentController(AgentRepository repo, AgentAuditRepository auditRepo) {
    this.repo = repo;
    this.auditRepo = auditRepo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(@RequestParam(required = false) String q) {
    String qq = q == null ? "" : q.trim().toLowerCase();
    List<AgentEntity> list =
        repo.findAll().stream()
            .filter(
                a ->
                    qq.isEmpty()
                        || (a.getName() != null && a.getName().toLowerCase().contains(qq))
                        || (a.getCode() != null && a.getCode().toLowerCase().contains(qq)))
            .toList();
    return PageDto.of(list.stream().map(AgentController::toJson).toList());
  }

  @GetMapping("/{id}/audit")
  public Map<String, Object> audit(@PathVariable String id) {
    ensureExists(id);
    List<Map<String, Object>> events =
        auditRepo.findByAgentIdOrderByIdAsc(id).stream().map(AgentController::toAuditJson).toList();
    return Map.of("events", events);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new AgentEntity();
    e.setId("AGT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    apply(e, body);
    if (e.getStatus() == null || e.getStatus().isBlank()) e.setStatus("Pending Approval");
    if (e.getMaker() == null || e.getMaker().isBlank()) e.setMaker("HO-Maker");
    if (e.getCreatedAt() == null || e.getCreatedAt().isBlank()) {
      e.setCreatedAt(nowTs());
    }
    repo.save(e);
    appendAudit(
        e.getId(),
        e.getMaker(),
        "Registered (pending approval)",
        "Exchange house / agent submitted for maker-checker onboarding.");
    return toJson(e);
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));
    String oldStatus = e.getStatus();
    apply(e, body);
    String newStatus = e.getStatus();

    if (body.containsKey("status") && !Objects.equals(oldStatus, newStatus)) {
      if ("On Hold".equals(newStatus) && "Pending Approval".equals(oldStatus)) {
        appendAudit(id, defaultChecker, "Placed on hold", "Onboarding review paused.");
      } else if ("Pending Approval".equals(newStatus) && "On Hold".equals(oldStatus)) {
        appendAudit(id, defaultChecker, "Released from hold", "Returned to pending approval queue.");
      } else if ("Rejected".equals(newStatus)) {
        String actor = e.getChecker() != null ? e.getChecker() : defaultChecker;
        appendAudit(id, actor, "Rejected (maker-checker)", "Agent / exchange house not approved.");
      }
    } else if (!body.isEmpty()) {
      String keys = String.join(", ", body.keySet());
      appendAudit(
          id,
          e.getMaker() != null ? e.getMaker() : "System",
          "Agent record updated",
          keys.length() > 200 ? keys.substring(0, 200) + "…" : keys);
    }

    return toJson(repo.save(e));
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));
    if (!"Pending Approval".equals(e.getStatus()) && !"On Hold".equals(e.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Agent is not awaiting checker approval");
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
        "Exchange house / correspondent agent cleared for operations (Active).");
    return toJson(e);
  }

  @PostMapping("/{id}/reject")
  public Map<String, Object> reject(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));
    if (!"Pending Approval".equals(e.getStatus()) && !"On Hold".equals(e.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Agent is not awaiting checker decision");
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
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found");
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

  private void appendAudit(String agentId, String actor, String action, String details) {
    var a = new AgentAuditEntity();
    a.setAgentId(agentId);
    a.setAtTs(nowTs());
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static void apply(AgentEntity e, Map<String, Object> body) {
    put(e::setCode, body, "code");
    put(e::setName, body, "name");
    put(e::setType, body, "type");
    put(e::setCountry, body, "country");
    put(e::setContactPhone, body, "contactPhone");
    put(e::setStatus, body, "status");
    put(e::setMaker, body, "maker");
    put(e::setChecker, body, "checker");
    put(e::setCreatedAt, body, "createdAt");
    put(e::setNotes, body, "notes");
  }

  private static void put(java.util.function.Consumer<String> c, Map<String, Object> body, String k) {
    if (!body.containsKey(k)) return;
    Object v = body.get(k);
    c.accept(v == null ? null : String.valueOf(v));
  }

  private static Map<String, Object> toJson(AgentEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("code", e.getCode());
    m.put("name", e.getName());
    m.put("type", e.getType());
    m.put("country", e.getCountry());
    m.put("contactPhone", e.getContactPhone());
    m.put("status", e.getStatus());
    m.put("maker", e.getMaker());
    if (e.getChecker() != null) m.put("checker", e.getChecker());
    m.put("createdAt", e.getCreatedAt());
    if (e.getNotes() != null) m.put("notes", e.getNotes());
    return m;
  }

  private static Map<String, Object> toAuditJson(AgentAuditEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("at", e.getAtTs());
    m.put("actor", e.getActor());
    m.put("action", e.getAction());
    if (e.getDetails() != null) m.put("details", e.getDetails());
    return m;
  }
}
