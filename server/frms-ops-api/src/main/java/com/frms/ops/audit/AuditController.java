package com.frms.ops.audit;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class AuditController {

  private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final AuditUserActivityRepository userActivityRepo;
  private final AdminPrivilegedAuditRepository privilegedAuditRepo;

  public AuditController(
      AuditUserActivityRepository userActivityRepo,
      AdminPrivilegedAuditRepository privilegedAuditRepo) {
    this.userActivityRepo = userActivityRepo;
    this.privilegedAuditRepo = privilegedAuditRepo;
    seedIfEmpty();
  }

  @GetMapping("/audit/user-activity")
  public List<AuditUserActivityEntity> getUserActivity() {
    return userActivityRepo.findAllByOrderByAtDesc();
  }

  @PostMapping("/audit/user-activity")
  public AuditUserActivityEntity addUserActivity(@RequestBody AuditUserActivityEntity event) {
    event.setId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    applyDefaults(event);
    return userActivityRepo.save(event);
  }

  @DeleteMapping("/audit/user-activity")
  public Map<String, Object> clearUserActivity() {
    long removed = userActivityRepo.count();
    userActivityRepo.deleteAllInBatch();
    return Map.of("ok", true, "deleted", removed);
  }

  @GetMapping("/admin/privileged-audit")
  public List<AdminPrivilegedAuditEntity> getPrivilegedAudit() {
    return privilegedAuditRepo.findAllByOrderByAtDesc();
  }

  @PostMapping("/admin/privileged-audit")
  public AdminPrivilegedAuditEntity addPrivilegedAudit(@RequestBody AdminPrivilegedAuditEntity event) {
    event.setId("PA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    applyDefaults(event);
    return privilegedAuditRepo.save(event);
  }

  private void seedIfEmpty() {
    if (userActivityRepo.count() == 0) {
      var a = new AuditUserActivityEntity();
      a.setId("ACT-SEED-001");
      a.setAt("2026-04-01 09:00");
      a.setAtUtc("2026-04-01T03:00:00Z");
      a.setCategory("auth");
      a.setEventType("login");
      a.setUserId("ho_admin");
      a.setActorUserId("ho_admin");
      a.setOutcome("Success");
      a.setResourceType("session");
      a.setResourceRef("SEC-SESSION-001");
      a.setIp("127.0.0.1");
      a.setDetails("Admin login from privileged console");
      a.setHow("password+mfa");
      a.setClientDevice("web");
      userActivityRepo.save(a);
    }

    if (privilegedAuditRepo.count() == 0) {
      var p = new AdminPrivilegedAuditEntity();
      p.setId("PA-SEED-001");
      p.setAt("2026-04-01 09:05");
      p.setAtUtc("2026-04-01T03:05:00Z");
      p.setCategory("admin_action");
      p.setEventType("role_assignment");
      p.setActorUserId("ho_admin");
      p.setTargetUserId("branch01_maker");
      p.setEnvironment("production");
      p.setResourceRef("USR-102");
      p.setIp("127.0.0.1");
      p.setDetails("Updated role policy limits");
      p.setOutcome("Success");
      p.setHow("maker-checker");
      p.setClientDevice("web");
      privilegedAuditRepo.save(p);
    }
  }

  private static void applyDefaults(AuditUserActivityEntity event) {
    if (isBlank(event.getAt())) {
      event.setAt(nowLocalTs());
    }
    if (isBlank(event.getAtUtc())) {
      event.setAtUtc(LocalDateTime.now(ZoneOffset.UTC).toString() + "Z");
    }
    if (isBlank(event.getOutcome())) {
      event.setOutcome("Success");
    }
    if (isBlank(event.getIp())) {
      event.setIp("127.0.0.1");
    }
    if (isBlank(event.getDetails())) {
      event.setDetails("No details provided");
    }
    if (isBlank(event.getCategory())) {
      event.setCategory("general");
    }
    if (isBlank(event.getEventType())) {
      event.setEventType("event");
    }
    if (isBlank(event.getUserId())) {
      event.setUserId("unknown");
    }
  }

  private static void applyDefaults(AdminPrivilegedAuditEntity event) {
    if (isBlank(event.getAt())) {
      event.setAt(nowLocalTs());
    }
    if (isBlank(event.getAtUtc())) {
      event.setAtUtc(LocalDateTime.now(ZoneOffset.UTC).toString() + "Z");
    }
    if (isBlank(event.getOutcome())) {
      event.setOutcome("Success");
    }
    if (isBlank(event.getIp())) {
      event.setIp("127.0.0.1");
    }
    if (isBlank(event.getDetails())) {
      event.setDetails("No details provided");
    }
    if (isBlank(event.getCategory())) {
      event.setCategory("admin_action");
    }
    if (isBlank(event.getEventType())) {
      event.setEventType("event");
    }
    if (isBlank(event.getActorUserId())) {
      event.setActorUserId("system");
    }
  }

  private static String nowLocalTs() {
    return LocalDateTime.now().format(TS);
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }
}
