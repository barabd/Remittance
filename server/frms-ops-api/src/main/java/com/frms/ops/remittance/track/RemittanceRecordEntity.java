package com.frms.ops.remittance.track;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "remittance_record")
public class RemittanceRecordEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "remittance_no", nullable = false, length = 64)
  private String remittanceNo;

  @Column(name = "exchange_house", nullable = false, length = 128)
  private String exchangeHouse;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  @Column(nullable = false, length = 128)
  private String corridor;

  @Column(nullable = false, length = 64)
  private String amount;

  @Column(nullable = false, length = 256)
  private String remitter;

  @Column(nullable = false, length = 256)
  private String beneficiary;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 16)
  private String channel;

  @Column(name = "photo_id_type", length = 64)
  private String photoIdType;

  @Column(name = "photo_id_ref", length = 128)
  private String photoIdRef;

  @Column(name = "remitter_party_id", length = 64)
  private String remitterPartyId;

  @Column(name = "beneficiary_party_id", length = 64)
  private String beneficiaryPartyId;

  @Column(name = "money_receipt_no", length = 64)
  private String moneyReceiptNo;

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

  public String getExchangeHouse() {
    return exchangeHouse;
  }

  public void setExchangeHouse(String exchangeHouse) {
    this.exchangeHouse = exchangeHouse;
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

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getPhotoIdType() {
    return photoIdType;
  }

  public void setPhotoIdType(String photoIdType) {
    this.photoIdType = photoIdType;
  }

  public String getPhotoIdRef() {
    return photoIdRef;
  }

  public void setPhotoIdRef(String photoIdRef) {
    this.photoIdRef = photoIdRef;
  }

  public String getRemitterPartyId() {
    return remitterPartyId;
  }

  public void setRemitterPartyId(String remitterPartyId) {
    this.remitterPartyId = remitterPartyId;
  }

  public String getBeneficiaryPartyId() {
    return beneficiaryPartyId;
  }

  public void setBeneficiaryPartyId(String beneficiaryPartyId) {
    this.beneficiaryPartyId = beneficiaryPartyId;
  }

  public String getMoneyReceiptNo() {
    return moneyReceiptNo;
  }

  public void setMoneyReceiptNo(String moneyReceiptNo) {
    this.moneyReceiptNo = moneyReceiptNo;
  }
}
