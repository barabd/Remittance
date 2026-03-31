package com.frms.ops.remittance.track;

import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RemittanceTrackingDataSeed {

  private static final String KW =
      "{\"BD\":[\"hundi\",\"hawala\",\"illegal corridor\",\"undocumented transfer\"],\"US\":[\"unlicensed msb\"]}";

  private final FrmsMlaSettingsRepository mlaRepo;
  private final RemittanceRecordRepository remittanceRepo;
  private final FrmsEhEntrySequenceRepository ehSeqRepo;

  public RemittanceTrackingDataSeed(
      FrmsMlaSettingsRepository mlaRepo,
      RemittanceRecordRepository remittanceRepo,
      FrmsEhEntrySequenceRepository ehSeqRepo) {
    this.mlaRepo = mlaRepo;
    this.remittanceRepo = remittanceRepo;
    this.ehSeqRepo = ehSeqRepo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (mlaRepo.count() == 0) {
      var m = new FrmsMlaSettingsEntity();
      m.setId(FrmsMlaSettingsEntity.SINGLETON_ID);
      m.setScreeningMode("keywords");
      m.setRequirePhotoId(true);
      m.setMaxRemittancesPerRemitterPerDay(30);
      m.setMaxBdtTotalPerRemitterPerDay(0);
      m.setPatternOneToManyMin(4);
      m.setPatternManyToOneMin(4);
      m.setBlockApprovalOnBusinessTerm(true);
      m.setBlockApprovalOnPattern(true);
      m.setBlockApprovalOnPrimaryAmlHit(false);
      m.setBlockApprovalOnOpacDsriHit(false);
      m.setAutoScreenOnSearchImport(true);
      m.setCountryKeywordsJson(KW);
      mlaRepo.save(m);
    }
    if (remittanceRepo.count() == 0) {
      remittanceRepo.save(
          rec(
              "REM-2026-000184",
              "REM-2026-000184",
              "EH-GULF-01",
              "2026-03-25 10:14",
              "USD → BDT",
              "2,500.00 USD",
              "John Smith",
              "Rahim Uddin",
              "Branch-01",
              "HO-Checker",
              "Approved",
              "BEFTN",
              "Passport",
              "US-PPT-DEMO-184"));
      remittanceRepo.save(
          rec(
              "REM-2026-000185",
              "REM-2026-000185",
              "EH-RUH-02",
              "2026-03-25 10:22",
              "AED → BDT",
              "4,000.00 AED",
              "Ahmed Ali",
              "Karim Mia",
              "Sub-Branch-03",
              null,
              "Pending Approval",
              "MFS",
              "National ID",
              "NID-AE-77821"));
      remittanceRepo.save(
          rec(
              "REM-2026-000186",
              "REM-2026-000186",
              "EH-GULF-01",
              "2026-03-25 10:33",
              "SAR → BDT",
              "1,200.00 SAR",
              "Mohammed Faisal",
              "Nusrat Jahan",
              "Branch-02",
              null,
              "On Hold",
              "RTGS",
              "Passport",
              "PPT-SA-99102"));
      if (ehSeqRepo.count() == 0) {
        var seq = new FrmsEhEntrySequenceEntity();
        seq.setId(FrmsEhEntrySequenceEntity.SINGLETON_ID);
        seq.setLastSeq(EhEntryIdService.DEMO_SEED_LAST_SEQ);
        ehSeqRepo.save(seq);
      }
    }
  }

  private static RemittanceRecordEntity rec(
      String id,
      String remittanceNo,
      String exchangeHouse,
      String createdAt,
      String corridor,
      String amount,
      String remitter,
      String beneficiary,
      String maker,
      String checker,
      String status,
      String channel,
      String photoIdType,
      String photoIdRef) {
    var e = new RemittanceRecordEntity();
    e.setId(id);
    e.setRemittanceNo(remittanceNo);
    e.setExchangeHouse(exchangeHouse);
    e.setCreatedAt(createdAt);
    e.setCorridor(corridor);
    e.setAmount(amount);
    e.setRemitter(remitter);
    e.setBeneficiary(beneficiary);
    e.setMaker(maker);
    e.setChecker(checker);
    e.setStatus(status);
    e.setChannel(channel);
    e.setPhotoIdType(photoIdType);
    e.setPhotoIdRef(photoIdRef);
    return e;
  }
}
