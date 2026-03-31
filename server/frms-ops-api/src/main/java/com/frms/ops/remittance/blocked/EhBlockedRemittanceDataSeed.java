package com.frms.ops.remittance.blocked;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class EhBlockedRemittanceDataSeed {

  private final EhBlockedRemittanceRepository repo;

  public EhBlockedRemittanceDataSeed(EhBlockedRemittanceRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;
    var e = new EhBlockedRemittanceEntity();
    e.setId("BLK-SEED-1");
    e.setRemittanceNo("REM-2026-000140");
    e.setRemitter("Demo Sender Ltd");
    e.setBeneficiary("Pending KYC User");
    e.setCorridor("GBP → BDT");
    e.setAmount("1,200.00 GBP");
    e.setBlockedAt("2026-03-24 11:20");
    e.setBranch("Head Office");
    e.setNote("Compliance hold — awaiting docs");
    repo.save(e);
  }
}
