package com.frms.ops.reports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "frms_report_request")
public class ReportRequestEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "report_name", nullable = false, length = 256)
  private String reportName;

  @Column(name = "generated_at", nullable = false, length = 32)
  private String generatedAt;

  @Column(name = "period_from", nullable = false, length = 16)
  private String periodFrom;

  @Column(name = "period_to", nullable = false, length = 16)
  private String periodTo;

  @Column(name = "branch_scope", nullable = false, length = 256)
  private String branchScope;

  @Column(name = "row_count", nullable = false)
  private int rowCount;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getReportName() { return reportName; }
  public void setReportName(String reportName) { this.reportName = reportName; }

  public String getGeneratedAt() { return generatedAt; }
  public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }

  public String getPeriodFrom() { return periodFrom; }
  public void setPeriodFrom(String periodFrom) { this.periodFrom = periodFrom; }

  public String getPeriodTo() { return periodTo; }
  public void setPeriodTo(String periodTo) { this.periodTo = periodTo; }

  public String getBranchScope() { return branchScope; }
  public void setBranchScope(String branchScope) { this.branchScope = branchScope; }

  public int getRowCount() { return rowCount; }
  public void setRowCount(int rowCount) { this.rowCount = rowCount; }

  public String getMaker() { return maker; }
  public void setMaker(String maker) { this.maker = maker; }

  public String getChecker() { return checker; }
  public void setChecker(String checker) { this.checker = checker; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
