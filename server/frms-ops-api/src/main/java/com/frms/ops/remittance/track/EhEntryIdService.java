package com.frms.ops.remittance.track;

import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Exchange House A.1.3 — DB-backed sequential IDs (RMI/BEN-EH/REM/MRC) aligned with {@code
 * src/state/abroadIdSequences.ts}. {@code held_seq} ties &quot;New IDs only&quot; to the next submit without double
 * bumping.
 */
@Service
public class EhEntryIdService {

  /** After demo seed remittances REM-…000184–186 — {@link RemittanceTrackingDataSeed} inserts this row. */
  public static final long DEMO_SEED_LAST_SEQ = 186L;

  private final FrmsEhEntrySequenceRepository repo;

  public EhEntryIdService(FrmsEhEntrySequenceRepository repo) {
    this.repo = repo;
  }

  /** Next formatted IDs for display — uses {@code held_seq} when set, else {@code last_seq + 1}. */
  @Transactional(readOnly = true)
  public Map<String, String> peekNextIds() {
    var opt = repo.findById(FrmsEhEntrySequenceEntity.SINGLETON_ID);
    long last = opt.map(FrmsEhEntrySequenceEntity::getLastSeq).orElse(0L);
    Long held = opt.map(FrmsEhEntrySequenceEntity::getHeldSeq).orElse(null);
    long n = held != null ? held : last + 1;
    return formatAll(n);
  }

  /**
   * &quot;New IDs only&quot;: advances {@code last_seq} and sets {@code held_seq} to that value (may orphan a prior held
   * slot).
   */
  @Transactional
  public Map<String, String> reserveIds() {
    FrmsEhEntrySequenceEntity e = loadForWrite();
    long next = e.getLastSeq() + 1;
    e.setLastSeq(next);
    e.setHeldSeq(next);
    repo.save(e);
    return formatAll(next);
  }

  /** After MLA passes: consume {@code held_seq} if present, else allocate the next {@code last_seq}. */
  @Transactional
  public long allocateForSubmit() {
    FrmsEhEntrySequenceEntity e = loadForWrite();
    if (e.getHeldSeq() != null) {
      long n = e.getHeldSeq();
      e.setHeldSeq(null);
      repo.save(e);
      return n;
    }
    long n = e.getLastSeq() + 1;
    e.setLastSeq(n);
    repo.save(e);
    return n;
  }

  private FrmsEhEntrySequenceEntity loadForWrite() {
    var opt = repo.findByIdForUpdate(FrmsEhEntrySequenceEntity.SINGLETON_ID);
    if (opt.isPresent()) {
      return opt.get();
    }
    var created = new FrmsEhEntrySequenceEntity();
    created.setId(FrmsEhEntrySequenceEntity.SINGLETON_ID);
    created.setLastSeq(0L);
    created.setHeldSeq(null);
    repo.save(created);
    repo.flush();
    return repo.findByIdForUpdate(FrmsEhEntrySequenceEntity.SINGLETON_ID).orElseThrow();
  }

  static Map<String, String> formatAll(long seq) {
    int y = Year.now().getValue();
    String p = pad6(seq);
    Map<String, String> m = new LinkedHashMap<>();
    m.put("remitterId", "RMI-" + y + "-" + p);
    m.put("beneficiaryId", "BEN-EH-" + y + "-" + p);
    m.put("remittanceNo", "REM-" + y + "-" + p);
    m.put("moneyReceiptNo", "MRC-" + y + "-" + p);
    return m;
  }

  private static String pad6(long n) {
    String s = String.valueOf(n);
    if (s.length() >= 6) return s;
    return "0".repeat(6 - s.length()) + s;
  }
}
