package com.frms.ops.reconciliation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reconciliation_exception")
public class ReconciliationExceptionEntity {

  @Id
  @Column(length = 64, nullable = false)
  private String id;

  @Column(name = "ref", length = 128, nullable = false)
  private String ref;

  @Column(name = "source", length = 32, nullable = false)
  private String source;

  @Column(name = "detected_at", length = 32, nullable = false)
  private String detectedAt;

  @Column(name = "amount", length = 64, nullable = false)
  private String amount;

  @Column(name = "reason", length = 128, nullable = false)
  private String reason;

  @Column(name = "status", length = 32, nullable = false)
  private String status;

  @Column(name = "resolution_note", length = 512)
  private String resolutionNote;

  @Column(name = "slab_id", length = 32)
  private String slabId;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getRef() {
    return ref;
  }

  public void setRef(String ref) {
    this.ref = ref;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getDetectedAt() {
    return detectedAt;
  }

  public void setDetectedAt(String detectedAt) {
    this.detectedAt = detectedAt;
  }

  public String getAmount() {
    return amount;
  }

  public void setAmount(String amount) {
    this.amount = amount;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getResolutionNote() {
    return resolutionNote;
  }


  public String getSlabId() {
    return slabId;
  }

  public void setSlabId(String slabId) {
    this.slabId = slabId;
  }
  public void setResolutionNote(String resolutionNote) {
    this.resolutionNote = resolutionNote;
  }
}
