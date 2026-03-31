package com.frms.ops.reconciliation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A single slab / band row in the slab-wise BEFTN &amp; Vostro reconciliation view.
 * Table {@code reconciliation_slab} — auto-created by Hibernate ({@code ddl-auto: update}).
 */
@Entity
@Table(name = "reconciliation_slab")
public class ReconciliationSlabEntity {

  @Id
  @Column(length = 32)
  private String id;

  /** BEFTN or Vostro */
  @Column(nullable = false, length = 16)
  private String channel;

  @Column(name = "slab_label", nullable = false, length = 128)
  private String slabLabel;

  /** Display-formatted lower bound, e.g. "৳ 0" or "USD 0" */
  @Column(name = "amount_from", nullable = false, length = 64)
  private String amountFrom;

  /** Display-formatted upper bound, e.g. "৳ 200,000" */
  @Column(name = "amount_to", nullable = false, length = 64)
  private String amountTo;

  @Column(name = "expected_credits", nullable = false)
  private int expectedCredits;

  @Column(name = "matched_credits", nullable = false)
  private int matchedCredits;

  /** Display-formatted variance string, e.g. "৳ 0" or "৳ 12,500" */
  @Column(nullable = false, length = 64)
  private String variance;

  /** Balanced | Review */
  @Column(nullable = false, length = 16)
  private String status;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getChannel() { return channel; }
  public void setChannel(String channel) { this.channel = channel; }

  public String getSlabLabel() { return slabLabel; }
  public void setSlabLabel(String slabLabel) { this.slabLabel = slabLabel; }

  public String getAmountFrom() { return amountFrom; }
  public void setAmountFrom(String amountFrom) { this.amountFrom = amountFrom; }

  public String getAmountTo() { return amountTo; }
  public void setAmountTo(String amountTo) { this.amountTo = amountTo; }

  public int getExpectedCredits() { return expectedCredits; }
  public void setExpectedCredits(int expectedCredits) { this.expectedCredits = expectedCredits; }

  public int getMatchedCredits() { return matchedCredits; }
  public void setMatchedCredits(int matchedCredits) { this.matchedCredits = matchedCredits; }

  public String getVariance() { return variance; }
  public void setVariance(String variance) { this.variance = variance; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
}
