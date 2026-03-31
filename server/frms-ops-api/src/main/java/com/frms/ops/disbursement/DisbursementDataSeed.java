package com.frms.ops.disbursement;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class DisbursementDataSeed {

  private final DisbursementItemRepository itemRepo;
  private final DisbursementAuditRepository auditRepo;

  public DisbursementDataSeed(
      DisbursementItemRepository itemRepo, DisbursementAuditRepository auditRepo) {
    this.itemRepo = itemRepo;
    this.auditRepo = auditRepo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (itemRepo.count() > 0) return;

    itemRepo.save(
        item(
            "REM-2026-000210",
            "REM-2026-000210",
            "2026-03-25 12:05",
            "USD → BDT",
            "BEFTN",
            "Bank A · 0123****89",
            "BEFTN-942114",
            "Rahim Uddin",
            "৳ 295,000.00",
            "Branch-01",
            "HO-Checker",
            "Approved",
            "Branch"));
    audit("REM-2026-000210", "2026-03-25 12:05", "Branch-01", "Created for disbursement", "BEFTN payout to Bank A · 0123****89");
    audit("REM-2026-000210", "2026-03-25 12:50", "HO-Checker", "Approved (maker-checker)", "Payout cleared for rail execution.");

    itemRepo.save(
        item(
            "REM-2026-000211",
            "REM-2026-000211",
            "2026-03-25 12:18",
            "AED → BDT",
            "MFS",
            "bKash · 01*********",
            null,
            "Karim Mia",
            "৳ 132,500.00",
            "Sub-Branch-03",
            null,
            "Pending Approval",
            "Sub-Branch"));
    audit("REM-2026-000211", "2026-03-25 12:18", "Sub-Branch-03", "Created for disbursement", "MFS payout to bKash · 01*********");
    audit("REM-2026-000211", "2026-03-25 12:40", "System", "Queued for maker-checker approval", null);

    itemRepo.save(
        item(
            "REM-2026-000212",
            "REM-2026-000212",
            "2026-03-25 12:35",
            "SAR → BDT",
            "RTGS",
            "Bank B · 77********01",
            "RTGS-118220",
            "Nusrat Jahan",
            "৳ 39,800.00",
            "Branch-02",
            null,
            "On Hold",
            "Branch"));
    audit("REM-2026-000212", "2026-03-25 12:35", "Branch-02", "Created for disbursement", "RTGS payout to Bank B · 77********01");
    audit("REM-2026-000212", "2026-03-25 12:42", "HO-Checker-01", "Placed on hold", "Payout paused pending review.");
  }

  private void audit(String disbursementId, String at, String actor, String action, String details) {
    var a = new DisbursementAuditEntity();
    a.setDisbursementId(disbursementId);
    a.setAtTs(at);
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    auditRepo.save(a);
  }

  private static DisbursementItemEntity item(
      String id,
      String remittanceNo,
      String createdAt,
      String corridor,
      String channel,
      String payoutTo,
      String payoutRef,
      String beneficiary,
      String amountBdt,
      String maker,
      String checker,
      String status,
      String originatingUnit) {
    var e = new DisbursementItemEntity();
    e.setId(id);
    e.setRemittanceNo(remittanceNo);
    e.setCreatedAt(createdAt);
    e.setCorridor(corridor);
    e.setChannel(channel);
    e.setPayoutTo(payoutTo);
    e.setPayoutRef(payoutRef);
    e.setBeneficiary(beneficiary);
    e.setAmountBdt(amountBdt);
    e.setMaker(maker);
    e.setChecker(checker);
    e.setStatus(status);
    e.setOriginatingUnit(originatingUnit);
    return e;
  }
}
