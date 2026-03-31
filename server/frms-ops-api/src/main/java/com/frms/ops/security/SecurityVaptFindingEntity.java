package com.frms.ops.security;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "security_vapt_finding")
public class SecurityVaptFindingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "reference_no", nullable = false, length = 32)
  private String referenceNo;

  @Column(name = "area_no")
  private Integer areaNo;

  @Column(name = "area_name", nullable = false, length = 128)
  private String areaName;

  @Column(nullable = false, length = 16)
  private String severity;

  @Column(nullable = false, length = 1024)
  private String description;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(length = 128)
  private String owner;

  @Column(name = "target_date", length = 16)
  private String targetDate;

  @Column(name = "closed_date", length = 16)
  private String closedDate;

  @Column(name = "ticket_id", length = 64)
  private String ticketId;

  @Column(name = "retest_notes", length = 512)
  private String retestNotes;

  @Column(name = "vapt_quarter", length = 16)
  private String vaptQuarter;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getReferenceNo() { return referenceNo; }
  public void setReferenceNo(String referenceNo) { this.referenceNo = referenceNo; }

  public Integer getAreaNo() { return areaNo; }
  public void setAreaNo(Integer areaNo) { this.areaNo = areaNo; }

  public String getAreaName() { return areaName; }
  public void setAreaName(String areaName) { this.areaName = areaName; }

  public String getSeverity() { return severity; }
  public void setSeverity(String severity) { this.severity = severity; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getOwner() { return owner; }
  public void setOwner(String owner) { this.owner = owner; }

  public String getTargetDate() { return targetDate; }
  public void setTargetDate(String targetDate) { this.targetDate = targetDate; }

  public String getClosedDate() { return closedDate; }
  public void setClosedDate(String closedDate) { this.closedDate = closedDate; }

  public String getTicketId() { return ticketId; }
  public void setTicketId(String ticketId) { this.ticketId = ticketId; }

  public String getRetestNotes() { return retestNotes; }
  public void setRetestNotes(String retestNotes) { this.retestNotes = retestNotes; }

  public String getVaptQuarter() { return vaptQuarter; }
  public void setVaptQuarter(String vaptQuarter) { this.vaptQuarter = vaptQuarter; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
