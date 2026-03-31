package com.frms.ops.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ops_email_outbox")
public class EmailOutboxRow {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "recipient", length = 512, nullable = false)
  private String recipient;

  @Column(length = 500, nullable = false)
  private String subject;

  @Column(name = "body_preview", columnDefinition = "NVARCHAR(MAX)", nullable = false)
  private String bodyPreview;

  @Column(name = "exchange_house", length = 256)
  private String exchangeHouse;

  @Column(name = "report_ref", length = 128)
  private String reportRef;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(length = 32, nullable = false)
  private String status;

  @PrePersist
  void prePersist() {
    if (id == null) {
      id = UUID.randomUUID().toString();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
    }
    if (status == null) {
      status = "queued";
    }
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public String getBodyPreview() {
    return bodyPreview;
  }

  public void setBodyPreview(String bodyPreview) {
    this.bodyPreview = bodyPreview;
  }

  public String getExchangeHouse() {
    return exchangeHouse;
  }

  public void setExchangeHouse(String exchangeHouse) {
    this.exchangeHouse = exchangeHouse;
  }

  public String getReportRef() {
    return reportRef;
  }

  public void setReportRef(String reportRef) {
    this.reportRef = reportRef;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
