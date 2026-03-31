package com.frms.ops.bulk;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "bulk_hub_event")
public class BulkHubEventEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 64)
  private String target;

  @Column(name = "file_name", nullable = false, length = 512)
  private String fileName;

  @Column(name = "row_count", nullable = false)
  private int rowCount;

  @Column(name = "column_count", nullable = false)
  private int columnCount;

  @Column(name = "sheet_name", length = 256)
  private String sheetName;

  @Column(name = "recorded_at", nullable = false, length = 32)
  private String recordedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTarget() {
    return target;
  }

  public void setTarget(String target) {
    this.target = target;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public int getRowCount() {
    return rowCount;
  }

  public void setRowCount(int rowCount) {
    this.rowCount = rowCount;
  }

  public int getColumnCount() {
    return columnCount;
  }

  public void setColumnCount(int columnCount) {
    this.columnCount = columnCount;
  }

  public String getSheetName() {
    return sheetName;
  }

  public void setSheetName(String sheetName) {
    this.sheetName = sheetName;
  }

  public String getRecordedAt() {
    return recordedAt;
  }

  public void setRecordedAt(String recordedAt) {
    this.recordedAt = recordedAt;
  }
}
