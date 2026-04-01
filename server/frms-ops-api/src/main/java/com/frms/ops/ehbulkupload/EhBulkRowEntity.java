package com.frms.ops.ehbulkupload;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_eh_bulk_row")
public class EhBulkRowEntity {

  @Id
  @Column(length = 80)
  private String id;

  @Column(name = "batch_id", nullable = false, length = 50)
  private String batchId;

  @Column(name = "row_no", nullable = false)
  private int rowNo;

  @Column(name = "remittance_no", nullable = false, length = 100)
  private String remittanceNo;

  @Column(nullable = false, length = 200)
  private String remitter;

  @Column(nullable = false, length = 200)
  private String beneficiary;

  @Column(nullable = false)
  private double amount;

  @Column(nullable = false, length = 10)
  private String currency;

  @Column(name = "payout_channel", nullable = false, length = 50)
  private String payoutChannel;

  @Column(name = "payout_to", nullable = false, length = 100)
  private String payoutTo;

  @Column(name = "exchange_house", nullable = false, length = 100)
  private String exchangeHouse;

  @Column(name = "photo_id_type", length = 50)
  private String photoIdType;

  @Column(name = "photo_id_ref", length = 100)
  private String photoIdRef;

  @Column
  private String errors;

  @Column(name = "incentive_bdt", nullable = false)
  private double incentiveBdt;

  @Column(name = "incentive_rule", length = 100)
  private String incentiveRule;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getBatchId() { return batchId; }
  public void setBatchId(String batchId) { this.batchId = batchId; }

  public int getRowNo() { return rowNo; }
  public void setRowNo(int rowNo) { this.rowNo = rowNo; }

  public String getRemittanceNo() { return remittanceNo; }
  public void setRemittanceNo(String remittanceNo) { this.remittanceNo = remittanceNo; }

  public String getRemitter() { return remitter; }
  public void setRemitter(String remitter) { this.remitter = remitter; }

  public String getBeneficiary() { return beneficiary; }
  public void setBeneficiary(String beneficiary) { this.beneficiary = beneficiary; }

  public double getAmount() { return amount; }
  public void setAmount(double amount) { this.amount = amount; }

  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }

  public String getPayoutChannel() { return payoutChannel; }
  public void setPayoutChannel(String payoutChannel) { this.payoutChannel = payoutChannel; }

  public String getPayoutTo() { return payoutTo; }
  public void setPayoutTo(String payoutTo) { this.payoutTo = payoutTo; }

  public String getExchangeHouse() { return exchangeHouse; }
  public void setExchangeHouse(String exchangeHouse) { this.exchangeHouse = exchangeHouse; }

  public String getPhotoIdType() { return photoIdType; }
  public void setPhotoIdType(String photoIdType) { this.photoIdType = photoIdType; }

  public String getPhotoIdRef() { return photoIdRef; }
  public void setPhotoIdRef(String photoIdRef) { this.photoIdRef = photoIdRef; }

  public String getErrors() { return errors; }
  public void setErrors(String errors) { this.errors = errors; }

  public double getIncentiveBdt() { return incentiveBdt; }
  public void setIncentiveBdt(double incentiveBdt) { this.incentiveBdt = incentiveBdt; }

  public String getIncentiveRule() { return incentiveRule; }
  public void setIncentiveRule(String incentiveRule) { this.incentiveRule = incentiveRule; }
}
