package com.frms.ops.remittance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "remittance_queue_item")
public class RemittanceQueueItemEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "remittance_no", nullable = false, length = 64)
  private String remittanceNo;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  @Column(nullable = false, length = 128)
  private String corridor;

  @Column(nullable = false, length = 64)
  private String amount;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(name = "pay_type", nullable = false, length = 32)
  private String payType;

  @Column(name = "exchange_house", nullable = false, length = 128)
  private String exchangeHouse;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(length = 128)
  private String checker;

  @Column(name = "approved_at", length = 32)
  private String approvedAt;

  @Column(name = "reject_reason", length = 512)
  private String rejectReason;

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

  public String getAmount() {
    return amount;
  }

  public void setAmount(String amount) {
    this.amount = amount;
  }

  public String getMaker() {
    return maker;
  }

  public void setMaker(String maker) {
    this.maker = maker;
  }

  public String getPayType() {
    return payType;
  }

  public void setPayType(String payType) {
    this.payType = payType;
  }

  public String getExchangeHouse() {
    return exchangeHouse;
  }

  public void setExchangeHouse(String exchangeHouse) {
    this.exchangeHouse = exchangeHouse;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getChecker() {
    return checker;
  }

  public void setChecker(String checker) {
    this.checker = checker;
  }

  public String getApprovedAt() {
    return approvedAt;
  }

  public void setApprovedAt(String approvedAt) {
    this.approvedAt = approvedAt;
  }

  public String getRejectReason() {
    return rejectReason;
  }

  public void setRejectReason(String rejectReason) {
    this.rejectReason = rejectReason;
  }
}
