package com.frms.ops.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_admin_privileged_audit")
public class AdminPrivilegedAuditEntity {

  @Id
  @Column(length = 50)
  private String id;

  @Column(name = "at", length = 50, nullable = false)
  private String at;

  @Column(name = "at_utc", length = 50)
  private String atUtc;

  @Column(length = 50, nullable = false)
  private String category;

  @Column(name = "event_type", length = 100, nullable = false)
  private String eventType;

  @Column(name = "actor_user_id", length = 100, nullable = false)
  private String actorUserId;

  @Column(name = "target_user_id", length = 100)
  private String targetUserId;

  @Column(length = 50)
  private String environment;

  @Column(name = "resource_ref")
  private String resourceRef;

  @Column(length = 50, nullable = false)
  private String ip;

  @Column(nullable = false)
  private String details;

  @Column(length = 50, nullable = false)
  private String outcome;

  @Column(length = 50)
  private String how;

  @Column(name = "client_device")
  private String clientDevice;

  @Column(name = "previous_entry_hash")
  private String previousEntryHash;

  @Column(name = "entry_hash")
  private String entryHash;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getAt() { return at; }
  public void setAt(String at) { this.at = at; }

  public String getAtUtc() { return atUtc; }
  public void setAtUtc(String atUtc) { this.atUtc = atUtc; }

  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }

  public String getEventType() { return eventType; }
  public void setEventType(String eventType) { this.eventType = eventType; }

  public String getActorUserId() { return actorUserId; }
  public void setActorUserId(String actorUserId) { this.actorUserId = actorUserId; }

  public String getTargetUserId() { return targetUserId; }
  public void setTargetUserId(String targetUserId) { this.targetUserId = targetUserId; }

  public String getEnvironment() { return environment; }
  public void setEnvironment(String environment) { this.environment = environment; }

  public String getResourceRef() { return resourceRef; }
  public void setResourceRef(String resourceRef) { this.resourceRef = resourceRef; }

  public String getIp() { return ip; }
  public void setIp(String ip) { this.ip = ip; }

  public String getDetails() { return details; }
  public void setDetails(String details) { this.details = details; }

  public String getOutcome() { return outcome; }
  public void setOutcome(String outcome) { this.outcome = outcome; }

  public String getHow() { return how; }
  public void setHow(String how) { this.how = how; }

  public String getClientDevice() { return clientDevice; }
  public void setClientDevice(String clientDevice) { this.clientDevice = clientDevice; }

  public String getPreviousEntryHash() { return previousEntryHash; }
  public void setPreviousEntryHash(String previousEntryHash) { this.previousEntryHash = previousEntryHash; }

  public String getEntryHash() { return entryHash; }
  public void setEntryHash(String entryHash) { this.entryHash = entryHash; }
}
