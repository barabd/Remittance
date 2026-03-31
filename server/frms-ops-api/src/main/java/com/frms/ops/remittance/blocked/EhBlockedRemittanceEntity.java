package com.frms.ops.remittance.blocked;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "eh_blocked_remittance")
public class EhBlockedRemittanceEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "remittance_record_id", length = 64)
  private String remittanceRecordId;

  @Column(name = "remittance_no", nullable = false, length = 64)
  private String remittanceNo;

  @Column(nullable = false, length = 256)
  private String remitter;

  @Column(nullable = false, length = 256)
  private String beneficiary;

  @Column(nullable = false, length = 128)
  private String corridor;

  @Column(nullable = false, length = 64)
  private String amount;

  @Column(name = "blocked_at", nullable = false, length = 32)
  private String blockedAt;

  @Column(length = 128)
  private String branch;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String note;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getRemittanceRecordId() {
    return remittanceRecordId;
  }

  public void setRemittanceRecordId(String remittanceRecordId) {
    this.remittanceRecordId = remittanceRecordId;
  }

  public String getRemittanceNo() {
    return remittanceNo;
  }

  public void setRemittanceNo(String remittanceNo) {
    this.remittanceNo = remittanceNo;
  }

  public String getRemitter() {
    return remitter;
  }

  public void setRemitter(String remitter) {
    this.remitter = remitter;
  }

  public String getBeneficiary() {
    return beneficiary;
  }

  public void setBeneficiary(String beneficiary) {
    this.beneficiary = beneficiary;
  }

  public String getCorridor() {
    return corridor;
  }

  public void setCorridor(String corridor) {
    this.corridor = corridor;
  }

  public String getAmount() {
    return amount;
  }

  public void setAmount(String amount) {
    this.amount = amount;
  }

  public String getBlockedAt() {
    return blockedAt;
  }

  public void setBlockedAt(String blockedAt) {
    this.blockedAt = blockedAt;
  }

  public String getBranch() {
    return branch;
  }

  public void setBranch(String branch) {
    this.branch = branch;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }
}
