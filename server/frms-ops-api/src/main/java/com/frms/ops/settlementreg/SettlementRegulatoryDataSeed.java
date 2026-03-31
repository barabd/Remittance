package com.frms.ops.settlementreg;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class SettlementRegulatoryDataSeed {

  private final SettlementWeekStatRepository weekRepo;
  private final SettlementBilateralPositionRepository bilateralRepo;

  public SettlementRegulatoryDataSeed(
      SettlementWeekStatRepository weekRepo, SettlementBilateralPositionRepository bilateralRepo) {
    this.weekRepo = weekRepo;
    this.bilateralRepo = bilateralRepo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (weekRepo.count() == 0) {
      weekRepo.save(stat("SWS-01", "Mon", 4_280_000_000L, 4_195_000_000L, 12_400_000L, 1));
      weekRepo.save(stat("SWS-02", "Tue", 4_510_000_000L, 4_402_000_000L, 15_100_000L, 2));
      weekRepo.save(stat("SWS-03", "Wed", 4_390_000_000L, 4_310_000_000L, 11_800_000L, 3));
      weekRepo.save(stat("SWS-04", "Thu", 4_680_000_000L, 4_588_000_000L, 14_600_000L, 4));
      weekRepo.save(stat("SWS-05", "Fri", 4_920_000_000L, 4_820_000_000L, 16_200_000L, 5));
    }
    if (bilateralRepo.count() == 0) {
      bilateralRepo.save(
          bilateral("BL-001", "NEC Money Transfer Ltd (UK)", "GBP → BDT", -128_400_000L, "2026-03-26", "EUR-UK"));
      bilateralRepo.save(
          bilateral("BL-002", "Wall Street Exchange Kuwait", "KWD → BDT", 64_200_000L, "2026-03-26", "Asia-GCC"));
      bilateralRepo.save(
          bilateral(
              "BL-003",
              "Al Rajhi Banking & Investment Corp",
              "SAR → BDT",
              210_900_000L,
              "2026-03-26",
              "Asia-GCC"));
      bilateralRepo.save(
          bilateral("BL-004", "Partner nostro (USD)", "USD → BDT", -88_000_000L, "2026-03-26", "USD-corridor"));
    }
  }

  private static SettlementWeekStatEntity stat(
      String id, String day, long gross, long net, long bilateralAdj, int order) {
    var e = new SettlementWeekStatEntity();
    e.setId(id);
    e.setDayLabel(day);
    e.setGrossInBdt(gross);
    e.setNetSettlementBdt(net);
    e.setBilateralAdjustments(bilateralAdj);
    e.setSortOrder(order);
    return e;
  }

  private static SettlementBilateralPositionEntity bilateral(
      String id, String cp, String corridor, long net, String asOf, String bucket) {
    var e = new SettlementBilateralPositionEntity();
    e.setId(id);
    e.setCounterparty(cp);
    e.setCorridor(corridor);
    e.setNetPositionBdt(net);
    e.setAsOf(asOf);
    e.setMultilateralBucket(bucket);
    return e;
  }
}
