package com.frms.ops.remittance.track;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_eh_entry_sequence")
public class FrmsEhEntrySequenceEntity {

  public static final String SINGLETON_ID = "SINGLE";

  @Id
  @Column(length = 16)
  private String id;

  @Column(name = "last_seq", nullable = false)
  private long lastSeq;

  /** Issued by {@code reserveIds}; consumed on next {@code allocateForSubmit} instead of advancing {@code lastSeq}. */
  @Column(name = "held_seq")
  private Long heldSeq;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public long getLastSeq() {
    return lastSeq;
  }

  public void setLastSeq(long lastSeq) {
    this.lastSeq = lastSeq;
  }

  public Long getHeldSeq() {
    return heldSeq;
  }

  public void setHeldSeq(Long heldSeq) {
    this.heldSeq = heldSeq;
  }
}
