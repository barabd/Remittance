package com.frms.ops.ehbulkupload;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_eh_bulk_batch")
public class EhBulkBatchEntity {

  @Id
  @Column(length = 50)
  private String id;

  @Column(name = "batch_status", nullable = false, length = 50)
  private String batchStatus;

  @Column(name = "created_at", nullable = false, length = 50)
  private String createdAt;

  @Column(name = "total_amount", nullable = false)
  private double totalAmount;

  @Column(name = "exchange_house", nullable = false, length = 100)
  private String exchangeHouse;

  @Column(name = "row_count", nullable = false)
  private int rowCount;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getBatchStatus() { return batchStatus; }
  public void setBatchStatus(String batchStatus) { this.batchStatus = batchStatus; }

  public String getCreatedAt() { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

  public double getTotalAmount() { return totalAmount; }
  public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

  public String getExchangeHouse() { return exchangeHouse; }
  public void setExchangeHouse(String exchangeHouse) { this.exchangeHouse = exchangeHouse; }

  public int getRowCount() { return rowCount; }
  public void setRowCount(int rowCount) { this.rowCount = rowCount; }
}
