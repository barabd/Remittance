package com.frms.ops.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ops_notification")
public class OpsNotification {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(length = 32, nullable = false)
  private String kind;

  @Column(length = 500, nullable = false)
  private String title;

  @Column(columnDefinition = "NVARCHAR(MAX)", nullable = false)
  private String body;

  @Column(name = "remittance_no", length = 256)
  private String remittanceNo;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "read_flag", nullable = false)
  private boolean read;

  @PrePersist
  void prePersist() {
    if (id == null) {
      id = UUID.randomUUID().toString();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }

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

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public String getRemittanceNo() {
    return remittanceNo;
  }

  public void setRemittanceNo(String remittanceNo) {
    this.remittanceNo = remittanceNo;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public boolean isRead() {
    return read;
  }

  public void setRead(boolean read) {
    this.read = read;
  }
}
