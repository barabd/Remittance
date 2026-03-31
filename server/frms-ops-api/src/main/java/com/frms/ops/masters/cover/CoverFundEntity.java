package com.frms.ops.masters.cover;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "masters_cover_fund")
public class CoverFundEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "fund_code", nullable = false, length = 64)
  private String fundCode;

  @Column(name = "partner_name", nullable = false, length = 256)
  private String partnerName;

  @Column(nullable = false, length = 8)
  private String currency;

  @Column(name = "balance_amount", nullable = false, precision = 18, scale = 2)
  private BigDecimal balanceAmount;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String notes;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getFundCode() {
    return fundCode;
  }

  public void setFundCode(String fundCode) {
    this.fundCode = fundCode;
  }

  public String getPartnerName() {
    return partnerName;
  }

  public void setPartnerName(String partnerName) {
    this.partnerName = partnerName;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public BigDecimal getBalanceAmount() {
    return balanceAmount;
  }

  public void setBalanceAmount(BigDecimal balanceAmount) {
    this.balanceAmount = balanceAmount;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
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

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
