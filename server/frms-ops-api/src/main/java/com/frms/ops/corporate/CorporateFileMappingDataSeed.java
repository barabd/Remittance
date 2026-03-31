package com.frms.ops.corporate;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CorporateFileMappingDataSeed implements CommandLineRunner {

  private final CorporateFileMappingProfileRepository profiles;
  private final CorporateFileMappingDefaultsRepository defaults;
  private final CorporateIncentiveTierRepository tiers;

  public CorporateFileMappingDataSeed(
      CorporateFileMappingProfileRepository profiles,
      CorporateFileMappingDefaultsRepository defaults,
      CorporateIncentiveTierRepository tiers) {
    this.profiles = profiles;
    this.defaults = defaults;
    this.tiers = tiers;
  }

  @Override
  public void run(String... args) {
    if (!profiles.existsById("default")) {
      var p = new CorporateFileMappingProfileEntity();
      p.setId("default");
      p.setName("Standard FRMS");
      p.setSearchFieldHeadersJson("{}");
      p.setBulkFieldHeadersJson("{}");
      p.setUpdatedAt(today());
      profiles.save(p);
    }

    if (!defaults.existsById(1)) {
      var d = new CorporateFileMappingDefaultsEntity();
      d.setId(1);
      d.setDefaultSearchProfileId("default");
      d.setDefaultBulkProfileId("default");
      d.setUpdatedAt(today());
      defaults.save(d);
    }

    if (tiers.count() == 0) {
      tiers.save(seed("INC-1", "Retail spill (<=100k BDT eq.)", 0, 100_000, 0.12, 10));
      tiers.save(seed("INC-2", "Mid ticket", 100_000, 2_000_000, 0.08, 25));
      tiers.save(seed("INC-3", "High touch / corporate", 2_000_000, 1e18, 0.04, 50));
    }
  }

  private CorporateIncentiveTierEntity seed(
      String id,
      String label,
      double min,
      double max,
      double pct,
      double flat) {
    var e = new CorporateIncentiveTierEntity();
    e.setId(id);
    e.setLabel(label);
    e.setMinBdtEquivalent(min);
    e.setMaxBdtEquivalent(max);
    e.setPctOfPrincipal(pct);
    e.setFlatBdt(flat);
    e.setUpdatedAt(today());
    return e;
  }

  private static String today() {
    return LocalDate.now().toString();
  }
}
