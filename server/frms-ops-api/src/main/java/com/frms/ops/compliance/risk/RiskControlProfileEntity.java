package com.frms.ops.compliance.risk;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "risk_control_profile")
public class RiskControlProfileEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "customer_name", nullable = false, length = 256)
  private String customerName;

  @Column(name = "max_per_txn_bdt", nullable = false)
  private long maxPerTxnBdt;

  @Column(name = "max_daily_total_bdt", nullable = false)
  private long maxDailyTotalBdt;

  @Column(name = "watch_level", nullable = false, length = 16)
  private String watchLevel;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getCustomerName() {
    return customerName;
  }

  public void setCustomerName(String customerName) {
    this.customerName = customerName;
  }

  public long getMaxPerTxnBdt() {
    return maxPerTxnBdt;
  }

  public void setMaxPerTxnBdt(long maxPerTxnBdt) {
    this.maxPerTxnBdt = maxPerTxnBdt;
  }

  public long getMaxDailyTotalBdt() {
    return maxDailyTotalBdt;
  }

  public void setMaxDailyTotalBdt(long maxDailyTotalBdt) {
    this.maxDailyTotalBdt = maxDailyTotalBdt;
  }

  public String getWatchLevel() {
    return watchLevel;
  }

  public void setWatchLevel(String watchLevel) {
    this.watchLevel = watchLevel;
  }

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }
}
