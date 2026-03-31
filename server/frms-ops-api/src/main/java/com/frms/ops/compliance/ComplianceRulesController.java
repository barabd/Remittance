package com.frms.ops.compliance;

import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import com.frms.ops.outbox.EmailOutboxRepository;
import com.frms.ops.remittance.track.RemittanceRecordRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Live readiness snapshot for Compliance Rules page (frontend ↔ backend ↔ database).
 */
@RestController
@RequestMapping("/compliance/rules")
public class ComplianceRulesController {

  private final FrmsMlaSettingsRepository mlaRepo;
  private final RemittanceRecordRepository remittanceRepo;
  private final AmlAlertRepository amlRepo;
  private final EmailOutboxRepository outboxRepo;

  @Value("${frms.ops.mail.enabled:false}")
  private boolean smtpEnabled;

  public ComplianceRulesController(
      FrmsMlaSettingsRepository mlaRepo,
      RemittanceRecordRepository remittanceRepo,
      AmlAlertRepository amlRepo,
      EmailOutboxRepository outboxRepo) {
    this.mlaRepo = mlaRepo;
    this.remittanceRepo = remittanceRepo;
    this.amlRepo = amlRepo;
    this.outboxRepo = outboxRepo;
  }

  @GetMapping("/readiness")
  public Map<String, Object> readiness() {
    var settingsOpt = mlaRepo.findById(FrmsMlaSettingsEntity.SINGLETON_ID);
    String screeningMode =
        settingsOpt
            .map(FrmsMlaSettingsEntity::getScreeningMode)
            .filter(v -> v != null && !v.isBlank())
            .orElse("keywords");

    long remittancePendingApprovalCount =
        remittanceRepo.findAll().stream()
            .filter(r -> "Pending Approval".equalsIgnoreCase(r.getStatus()))
            .count();

    long amlAlertOpenCount =
        amlRepo.findAll().stream().filter(a -> "Open".equalsIgnoreCase(a.getStatus())).count();

    long outboxQueuedCount =
        outboxRepo.findAll().stream()
            .filter(o -> "queued".equalsIgnoreCase(o.getStatus()))
            .count();

    Map<String, Object> backend = new LinkedHashMap<>();
    backend.put("ok", true);
    backend.put("service", "frms-ops-api");

    Map<String, Object> database = new LinkedHashMap<>();
    database.put("mlaSettingsSeeded", settingsOpt.isPresent());
    database.put("screeningMode", screeningMode);
    database.put("remittanceRecordCount", remittanceRepo.count());
    database.put("remittancePendingApprovalCount", remittancePendingApprovalCount);
    database.put("amlAlertOpenCount", amlAlertOpenCount);
    database.put("emailOutboxQueuedCount", outboxQueuedCount);

    Map<String, Object> integrations = new LinkedHashMap<>();
    integrations.put("smtpEnabled", smtpEnabled);
    integrations.put("emailOutboxMode", smtpEnabled ? "delivery" : "audit_only");

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("generatedAt", LocalDateTime.now().toString().replace('T', ' '));
    payload.put("backend", backend);
    payload.put("database", database);
    payload.put("integrations", integrations);
    return payload;
  }
}
