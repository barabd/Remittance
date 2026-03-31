package com.frms.ops.masters.beneficiary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "masters_beneficiary_audit")
public class BeneficiaryAuditEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "beneficiary_id", nullable = false, length = 64)
  private String beneficiaryId;

  @Column(name = "at_ts", nullable = false, length = 32)
  private String atTs;

  @Column(nullable = false, length = 128)
  private String actor;

  @Column(nullable = false, length = 256)
  private String action;

  @Column(length = 512)
  private String details;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getBeneficiaryId() {
    return beneficiaryId;
  }

  public void setBeneficiaryId(String beneficiaryId) {
    this.beneficiaryId = beneficiaryId;
  }

  public String getAtTs() {
    return atTs;
  }

  public void setAtTs(String atTs) {
    this.atTs = atTs;
  }

  public String getActor() {
    return actor;
  }

  public void setActor(String actor) {
    this.actor = actor;
  }

  public String getAction() {
    return action;
  }

  public void setAction(String action) {
    this.action = action;
  }

  public String getDetails() {
    return details;
  }

  public void setDetails(String details) {
    this.details = details;
  }
}
