package com.frms.ops.integrations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_integration_webhook_log")
public class IntegrationWebhookLogEntity {
  @Id
  @Column(length = 50)
  private String id;

  @Column(name = "connector_id", nullable = false, length = 50)
  private String connectorId;

  @Column(name = "recorded_at", nullable = false, length = 50)
  private String recordedAt;

  @Column(nullable = false, length = 20)
  private String direction;

  @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
  private String message;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getConnectorId() { return connectorId; }
  public void setConnectorId(String connectorId) { this.connectorId = connectorId; }
  public String getRecordedAt() { return recordedAt; }
  public void setRecordedAt(String recordedAt) { this.recordedAt = recordedAt; }
  public String getDirection() { return direction; }
  public void setDirection(String direction) { this.direction = direction; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
}
