package com.frms.ops.remittance;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RemittanceQueueDataSeed {

  private final RemittanceQueueItemRepository repo;

  public RemittanceQueueDataSeed(RemittanceQueueItemRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;
    // Align with RemittanceTrackingDataSeed: 184 is already Approved (not on queue); 185 pending; 186 on hold.
    repo.save(row("1", "REM-2026-000185", "2026-03-25 10:22", "AED → BDT", "4,000.00 AED", "Sub-Branch-03", "Cash", "EH-RUH-02", "Pending Approval"));
    repo.save(row("2", "REM-2026-000186", "2026-03-25 10:33", "SAR → BDT", "1,200.00 SAR", "Branch-02", "Account pay", "EH-GULF-01", "On Hold"));
  }

  private static RemittanceQueueItemEntity row(
      String id,
      String remittanceNo,
      String createdAt,
      String corridor,
      String amount,
      String maker,
      String payType,
      String exchangeHouse,
      String status) {
    var e = new RemittanceQueueItemEntity();
    e.setId(id);
    e.setRemittanceNo(remittanceNo);
    e.setCreatedAt(createdAt);
    e.setCorridor(corridor);
    e.setAmount(amount);
    e.setMaker(maker);
    e.setPayType(payType);
    e.setExchangeHouse(exchangeHouse);
    e.setStatus(status);
    return e;
  }
}
