package com.frms.ops.masters.beneficiary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "masters_beneficiary")
public class BeneficiaryEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "full_name", nullable = false, length = 256)
  private String fullName;

  @Column(nullable = false, length = 64)
  private String phone;

  @Column(name = "id_document_ref", nullable = false, length = 128)
  private String idDocumentRef;

  @Column(name = "bank_name", nullable = false, length = 256)
  private String bankName;

  @Column(name = "bank_account_masked", nullable = false, length = 128)
  private String bankAccountMasked;

  @Column(nullable = false, length = 128)
  private String branch;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String notes;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getIdDocumentRef() {
    return idDocumentRef;
  }

  public void setIdDocumentRef(String idDocumentRef) {
    this.idDocumentRef = idDocumentRef;
  }

  public String getBankName() {
    return bankName;
  }

  public void setBankName(String bankName) {
    this.bankName = bankName;
  }

  public String getBankAccountMasked() {
    return bankAccountMasked;
  }

  public void setBankAccountMasked(String bankAccountMasked) {
    this.bankAccountMasked = bankAccountMasked;
  }

  public String getBranch() {
    return branch;
  }

  public void setBranch(String branch) {
    this.branch = branch;
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

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
