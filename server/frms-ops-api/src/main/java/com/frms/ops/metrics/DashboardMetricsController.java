package com.frms.ops.metrics;

import com.frms.ops.compliance.AmlAlertRepository;
import com.frms.ops.disbursement.DisbursementItemEntity;
import com.frms.ops.disbursement.DisbursementItemRepository;
import com.frms.ops.masters.agent.AgentEntity;
import com.frms.ops.masters.agent.AgentRepository;
import com.frms.ops.masters.beneficiary.BeneficiaryEntity;
import com.frms.ops.masters.beneficiary.BeneficiaryRepository;
import com.frms.ops.masters.cover.CoverFundEntity;
import com.frms.ops.masters.cover.CoverFundRepository;
import com.frms.ops.remittance.RemittanceQueueItemEntity;
import com.frms.ops.remittance.RemittanceQueueItemRepository;
import com.frms.ops.remittance.track.RemittanceRecordRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aggregated counts for the SPA integrations demo and dashboard widgets — {@code GET /metrics/dashboard}.
 */
@RestController
@RequestMapping("/metrics")
public class DashboardMetricsController {

  private final RemittanceQueueItemRepository queueRepo;
  private final DisbursementItemRepository disbursementRepo;
  private final RemittanceRecordRepository remittanceRepo;
  private final AmlAlertRepository amlRepo;
  private final BeneficiaryRepository beneficiaryRepo;
  private final AgentRepository agentRepo;
  private final CoverFundRepository coverRepo;

  public DashboardMetricsController(
      RemittanceQueueItemRepository queueRepo,
      DisbursementItemRepository disbursementRepo,
      RemittanceRecordRepository remittanceRepo,
      AmlAlertRepository amlRepo,
      BeneficiaryRepository beneficiaryRepo,
      AgentRepository agentRepo,
      CoverFundRepository coverRepo) {
    this.queueRepo = queueRepo;
    this.disbursementRepo = disbursementRepo;
    this.remittanceRepo = remittanceRepo;
    this.amlRepo = amlRepo;
    this.beneficiaryRepo = beneficiaryRepo;
    this.agentRepo = agentRepo;
    this.coverRepo = coverRepo;
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    long queueActive =
        queueRepo.findAll().stream().filter(DashboardMetricsController::queueInWorklist).count();
    long disbPending =
        disbursementRepo.findAll().stream()
            .filter(d -> "Pending Approval".equals(d.getStatus()))
            .count();
    long worklist = queueActive + disbPending;

    long trackingPending =
        remittanceRepo.findAll().stream()
            .filter(r -> "Pending Approval".equals(r.getStatus()))
            .count();

    long pendingApprovals = worklist + trackingPending;

    long amlOpen = amlRepo.findAll().stream().filter(a -> "Open".equals(a.getStatus())).count();

    long mastersPending =
        beneficiaryRepo.findAll().stream().filter(DashboardMetricsController::masterPending).count()
            + agentRepo.findAll().stream().filter(DashboardMetricsController::masterPending).count()
            + coverRepo.findAll().stream().filter(DashboardMetricsController::masterPending).count();

    Map<String, Object> m = new LinkedHashMap<>();
    m.put("worklistRowTotal", worklist);
    m.put("pendingApprovalsTotal", pendingApprovals);
    m.put("amlOpenHits", amlOpen);
    m.put("masterDataPending", mastersPending);
    m.put("reconExceptions", 0);
    return m;
  }

  private static boolean queueInWorklist(RemittanceQueueItemEntity i) {
    String s = i.getStatus();
    return "Pending Approval".equals(s) || "On Hold".equals(s);
  }

  private static boolean masterPending(BeneficiaryEntity e) {
    return "Pending Approval".equals(e.getStatus()) || "On Hold".equals(e.getStatus());
  }

  private static boolean masterPending(AgentEntity e) {
    return "Pending Approval".equals(e.getStatus()) || "On Hold".equals(e.getStatus());
  }

  private static boolean masterPending(CoverFundEntity e) {
    return "Pending Approval".equals(e.getStatus()) || "On Hold".equals(e.getStatus());
  }
}
