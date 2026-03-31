package com.frms.ops.settlementreg;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "regulatory_package")
public class RegulatoryPackageEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 64)
  private String kind;

  @Column(nullable = false, length = 512)
  private String title;

  @Column(nullable = false, length = 64)
  private String period;

  @Column(nullable = false, length = 4000)
  private String summary;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 512)
  private String destination;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getKind() {
    return kind;
  }

  public void setKind(String kind) {
    this.kind = kind;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getPeriod() {
    return period;
  }

  public void setPeriod(String period) {
    this.period = period;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getDestination() {
    return destination;
  }

  public void setDestination(String destination) {
    this.destination = destination;
  }

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }
}
