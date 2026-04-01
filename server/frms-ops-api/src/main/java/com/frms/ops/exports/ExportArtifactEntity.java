package com.frms.ops.exports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "frms_export_artifact")
public class ExportArtifactEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "export_format", nullable = false, length = 16)
  private String exportFormat;

  @Column(nullable = false, length = 256)
  private String title;

  @Column(name = "file_name", nullable = false, length = 256)
  private String fileName;

  @Column(name = "mime_type", nullable = false, length = 128)
  private String mimeType;

  @Column(name = "row_count", nullable = false)
  private int rowCount;

  @Column(name = "generated_by", length = 128)
  private String generatedBy;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "payload_hash", length = 128)
  private String payloadHash;

  @Lob
  @Column(name = "file_content", nullable = false)
  private byte[] fileContent;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getExportFormat() { return exportFormat; }
  public void setExportFormat(String exportFormat) { this.exportFormat = exportFormat; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public String getMimeType() { return mimeType; }
  public void setMimeType(String mimeType) { this.mimeType = mimeType; }
  public int getRowCount() { return rowCount; }
  public void setRowCount(int rowCount) { this.rowCount = rowCount; }
  public String getGeneratedBy() { return generatedBy; }
  public void setGeneratedBy(String generatedBy) { this.generatedBy = generatedBy; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
  public String getPayloadHash() { return payloadHash; }
  public void setPayloadHash(String payloadHash) { this.payloadHash = payloadHash; }
  public byte[] getFileContent() { return fileContent; }
  public void setFileContent(byte[] fileContent) { this.fileContent = fileContent; }
}
