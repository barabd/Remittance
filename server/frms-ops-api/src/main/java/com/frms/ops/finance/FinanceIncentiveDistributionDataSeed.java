package com.frms.ops.finance;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class FinanceIncentiveDistributionDataSeed implements CommandLineRunner {

  private final FinanceIncentiveDistributionBatchRepository repo;

  public FinanceIncentiveDistributionDataSeed(FinanceIncentiveDistributionBatchRepository repo) {
    this.repo = repo;
  }

  @Override
  public void run(String... args) {
    if (repo.count() > 0) return;
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    repo.save(seed("IDB-001", "EH-GULF-01", "2026-03", 128450.75, 1840, "Accrued", "Nostro adjustment", now));
    repo.save(seed("IDB-002", "EH-RUH-02", "2026-03", 82110.20, 960, "Approved for payout", "Partner invoice", now));
  }

  private static FinanceIncentiveDistributionBatchEntity seed(
      String id,
      String exchangeHouse,
      String period,
      double totalIncentiveBdt,
      int remittanceCount,
      String status,
      String channel,
      OffsetDateTime now) {
    var e = new FinanceIncentiveDistributionBatchEntity();
    e.setId(id);
    e.setExchangeHouse(exchangeHouse);
    e.setPeriod(period);
    e.setTotalIncentiveBdt(totalIncentiveBdt);
    e.setRemittanceCount(remittanceCount);
    e.setStatus(status);
    e.setChannel(channel);
    e.setCreatedAt(now);
    e.setUpdatedAt(now);
    return e;
  }
}
