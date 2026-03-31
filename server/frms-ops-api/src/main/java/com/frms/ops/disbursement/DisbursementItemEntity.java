package com.frms.ops.disbursement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "disbursement_item")
public class DisbursementItemEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "remittance_no", nullable = false, length = 64)
  private String remittanceNo;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  @Column(nullable = false, length = 128)
  private String corridor;

  @Column(nullable = false, length = 16)
  private String channel;

  @Column(name = "payout_to", nullable = false, length = 256)
  private String payoutTo;

  @Column(name = "payout_ref", length = 64)
  private String payoutRef;

  @Column(nullable = false, length = 256)
  private String beneficiary;

  @Column(name = "amount_bdt", nullable = false, length = 64)
  private String amountBdt;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "originating_unit", nullable = false, length = 32)
  private String originatingUnit;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getRemittanceNo() {
    return remittanceNo;
  }

  public void setRemittanceNo(String remittanceNo) {
    this.remittanceNo = remittanceNo;
  }

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }

  public String getCorridor() {
    return corridor;
  }

  public void setCorridor(String corridor) {
    this.corridor = corridor;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getPayoutTo() {
    return payoutTo;
  }

  public void setPayoutTo(String payoutTo) {
    this.payoutTo = payoutTo;
  }

  public String getPayoutRef() {
    return payoutRef;
  }

  public void setPayoutRef(String payoutRef) {
    this.payoutRef = payoutRef;
  }

  public String getBeneficiary() {
    return beneficiary;
  }

  public void setBeneficiary(String beneficiary) {
    this.beneficiary = beneficiary;
  }

  public String getAmountBdt() {
    return amountBdt;
  }

  public void setAmountBdt(String amountBdt) {
    this.amountBdt = amountBdt;
  }

  public String getMaker() {
    return maker;
  }

  public void setMaker(String maker) {
    this.maker = maker;
  }

  public String getChecker() {
    return checker;
  }

  public void setChecker(String checker) {
    this.checker = checker;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getOriginatingUnit() {
    return originatingUnit;
  }

  public void setOriginatingUnit(String originatingUnit) {
    this.originatingUnit = originatingUnit;
  }
}
