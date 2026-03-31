package com.frms.ops.compliance.risk;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Seeds demo risk-control profiles into {@code risk_control_profile} on first boot.
 * Without seed rows the Risk Controls page shows an empty grid in live mode.
 */
@Component
public class RiskControlDataSeed {

  private final RiskControlProfileRepository repo;

  public RiskControlDataSeed(RiskControlProfileRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;

    repo.save(profile("RISK-1", "Rahim Uddin",  500_000L, 1_500_000L, "Medium", "2026-03-26 09:00"));
    repo.save(profile("RISK-2", "Karim Mia",    300_000L,   900_000L, "High",   "2026-03-26 09:00"));
  }

  private static RiskControlProfileEntity profile(
      String id,
      String customerName,
      long maxPerTxnBdt,
      long maxDailyTotalBdt,
      String watchLevel,
      String updatedAt) {
    var e = new RiskControlProfileEntity();
    e.setId(id);
    e.setCustomerName(customerName);
    e.setMaxPerTxnBdt(maxPerTxnBdt);
    e.setMaxDailyTotalBdt(maxDailyTotalBdt);
    e.setWatchLevel(watchLevel);
    e.setUpdatedAt(updatedAt);
    return e;
  }
}
