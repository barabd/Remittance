package com.frms.ops.feedback;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ops_feedback_log")
public class FeedbackLogRow {

  @Id
  @Column(length = 36, nullable = false)
  private String id;

  @Column(name = "logged_at", nullable = false)
  private Instant loggedAt;

  @Column(length = 64, nullable = false)
  private String source;

  @Column(columnDefinition = "NVARCHAR(MAX)", nullable = false)
  private String message;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String meta;

  @PrePersist
  void prePersist() {
    if (id == null) {
      id = UUID.randomUUID().toString();
    }
    if (loggedAt == null) {
      loggedAt = Instant.now();
    }
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public Instant getLoggedAt() {
    return loggedAt;
  }

  public void setLoggedAt(Instant loggedAt) {
    this.loggedAt = loggedAt;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getMeta() {
    return meta;
  }

  public void setMeta(String meta) {
    this.meta = meta;
  }
}
