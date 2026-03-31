package com.frms.ops.compliance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "compliance_aml_alert")
public class AmlAlertEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "remittance_no", nullable = false, length = 64)
  private String remittanceNo;

  @Column(name = "screened_at", nullable = false, length = 32)
  private String screenedAt;

  @Column(name = "match_type", nullable = false, length = 16)
  private String matchType;

  @Column(name = "list_name", nullable = false, length = 32)
  private String listName;

  @Column(nullable = false)
  private int score;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "subject_hint", length = 512)
  private String subjectHint;

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

  public String getScreenedAt() {
    return screenedAt;
  }

  public void setScreenedAt(String screenedAt) {
    this.screenedAt = screenedAt;
  }

  public String getMatchType() {
    return matchType;
  }

  public void setMatchType(String matchType) {
    this.matchType = matchType;
  }

  public String getListName() {
    return listName;
  }

  public void setListName(String listName) {
    this.listName = listName;
  }

  public int getScore() {
    return score;
  }

  public void setScore(int score) {
    this.score = score;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getSubjectHint() {
    return subjectHint;
  }

  public void setSubjectHint(String subjectHint) {
    this.subjectHint = subjectHint;
  }
}
