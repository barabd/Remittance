package com.frms.ops.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ops_sms_outbox")
public class SmsOutboxRow {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "recipient_msisdn", length = 64, nullable = false)
  private String recipientMsisdn;

  @Column(name = "message_preview", length = 1000, nullable = false)
  private String messagePreview;

  @Column(length = 128)
  private String provider;

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

  public String getRecipientMsisdn() {
    return recipientMsisdn;
  }

  public void setRecipientMsisdn(String recipientMsisdn) {
    this.recipientMsisdn = recipientMsisdn;
  }

  public String getMessagePreview() {
    return messagePreview;
  }

  public void setMessagePreview(String messagePreview) {
    this.messagePreview = messagePreview;
  }

  public String getProvider() {
    return provider;
  }

  public void setProvider(String provider) {
    this.provider = provider;
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
