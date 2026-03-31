package com.frms.ops.remittance.blocked;

import com.frms.ops.remittance.track.RemittanceRecordEntity;
import com.frms.ops.remittance.track.RemittanceRecordRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stop-payment register for Exchange House blocked reports. Upsert when {@code remittance_record.status} becomes
 * Stopped; remove when status leaves Stopped or user releases from the reports UI.
 */
@Service
public class EhBlockedRemittanceService {

  private static final DateTimeFormatter BLOCKED_AT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final EhBlockedRemittanceRepository blockedRepo;
  private final RemittanceRecordRepository remittanceRepo;

  public EhBlockedRemittanceService(
      EhBlockedRemittanceRepository blockedRepo, RemittanceRecordRepository remittanceRepo) {
    this.blockedRepo = blockedRepo;
    this.remittanceRepo = remittanceRepo;
  }

  @Transactional
  public void syncAfterRemittancePatch(RemittanceRecordEntity row, String previousStatus) {
    String ns = row.getStatus();
    if ("Stopped".equals(ns)) {
      boolean refreshBlockedAt = previousStatus == null || !"Stopped".equals(previousStatus);
      upsertFromRecord(row, refreshBlockedAt);
    } else if (previousStatus != null && "Stopped".equals(previousStatus)) {
      blockedRepo.deleteByRemittanceNo(row.getRemittanceNo());
    }
  }

  /**
   * @param refreshBlockedAt when true, updates blocked_at (e.g. re-stop)
   */
  @Transactional
  public void upsertFromRecord(RemittanceRecordEntity row, boolean refreshBlockedAt) {
    var opt = blockedRepo.findByRemittanceNo(row.getRemittanceNo());
    boolean isNew = opt.isEmpty();
    EhBlockedRemittanceEntity e = opt.orElseGet(EhBlockedRemittanceEntity::new);
    if (e.getId() == null || e.getId().isBlank()) {
      e.setId("BLK-" + UUID.randomUUID());
    }
    e.setRemittanceRecordId(row.getId());
    e.setRemittanceNo(row.getRemittanceNo());
    e.setRemitter(nz(row.getRemitter()));
    e.setBeneficiary(nz(row.getBeneficiary()));
    e.setCorridor(nz(row.getCorridor()));
    e.setAmount(nz(row.getAmount()));
    if (e.getBlockedAt() == null || e.getBlockedAt().isBlank() || refreshBlockedAt) {
      e.setBlockedAt(BLOCKED_AT_FMT.format(LocalDateTime.now()));
    }
    e.setBranch(row.getExchangeHouse());
    if (isNew && (e.getNote() == null || e.getNote().isBlank())) {
      e.setNote("Stopped from Search & Tracking");
    }
    blockedRepo.save(e);
  }

  @Transactional
  public void releaseById(String id) {
    var b =
        blockedRepo
            .findById(id)
            .orElseThrow(
                () -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Blocked remittance not found"));
    String rid = b.getRemittanceRecordId();
    String rno = b.getRemittanceNo();
    blockedRepo.delete(b);

    if (rid != null && !rid.isBlank()) {
      remittanceRepo.findById(rid).ifPresent(this::clearStopIfStopped);
    } else {
      remittanceRepo.findAll().stream()
          .filter(r -> rno.equals(r.getRemittanceNo()) && "Stopped".equals(r.getStatus()))
          .findFirst()
          .ifPresent(this::clearStopIfStopped);
    }
  }

  private void clearStopIfStopped(RemittanceRecordEntity r) {
    if ("Stopped".equals(r.getStatus())) {
      r.setStatus("Pending Approval");
      remittanceRepo.save(r);
    }
  }

  private static String nz(String s) {
    return s == null ? "" : s;
  }
}
