package com.frms.ops.beftn;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "beftn_ack_file")
public class BeftnAckFileEntity {

  @Id
  @Column(length = 64, nullable = false)
  private String id;

  @Column(name = "file_name", length = 512, nullable = false)
  private String fileName;

  @Column(name = "uploaded_at", length = 32, nullable = false)
  private String uploadedAt;

  @Column(length = 128)
  private String uploader;

  @Column(name = "row_count", nullable = false)
  private int rowCount;

  @Column(length = 32, nullable = false)
  private String status;

  @Column(name = "applied_at", length = 32)
  private String appliedAt;

  @Column(name = "summary_json", columnDefinition = "NVARCHAR(MAX)")
  private String summaryJson;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getUploadedAt() {
    return uploadedAt;
  }

  public void setUploadedAt(String uploadedAt) {
    this.uploadedAt = uploadedAt;
  }

  public String getUploader() {
    return uploader;
  }

  public void setUploader(String uploader) {
    this.uploader = uploader;
  }

  public int getRowCount() {
    return rowCount;
  }

  public void setRowCount(int rowCount) {
    this.rowCount = rowCount;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getAppliedAt() {
    return appliedAt;
  }

  public void setAppliedAt(String appliedAt) {
    this.appliedAt = appliedAt;
  }

  public String getSummaryJson() {
    return summaryJson;
  }

  public void setSummaryJson(String summaryJson) {
    this.summaryJson = summaryJson;
  }
}
