package com.frms.ops.compliance.mla;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Seeds the singleton {@code frms_mla_settings} row on first boot.
 * Without this row the {@link MlaSettingsController} returns 404 and the
 * AML Compliance Settings page cannot load from the live API.
 */
@Component
public class MlaSettingsDataSeed {

  private final FrmsMlaSettingsRepository repo;

  public MlaSettingsDataSeed(FrmsMlaSettingsRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.existsById(FrmsMlaSettingsEntity.SINGLETON_ID)) return;

    var e = new FrmsMlaSettingsEntity();
    e.setId(FrmsMlaSettingsEntity.SINGLETON_ID);
    e.setScreeningMode("keywords");
    e.setRequirePhotoId(true);
    e.setMaxRemittancesPerRemitterPerDay(5);
    e.setMaxBdtTotalPerRemitterPerDay(500_000L);
    e.setPatternOneToManyMin(3);
    e.setPatternManyToOneMin(3);
    e.setBlockApprovalOnBusinessTerm(true);
    e.setBlockApprovalOnPattern(false);
    e.setBlockApprovalOnPrimaryAmlHit(true);
    e.setBlockApprovalOnOpacDsriHit(true);
    e.setAutoScreenOnSearchImport(true);
    e.setCountryKeywordsJson("{}");
    repo.save(e);
  }
}
