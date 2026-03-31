package com.frms.ops.settlementreg;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settlement_week_stat")
public class SettlementWeekStatEntity {

  @Id
  @Column(length = 32)
  private String id;

  @Column(name = "day_label", nullable = false, length = 16)
  private String dayLabel;

  @Column(name = "gross_in_bdt", nullable = false)
  private long grossInBdt;

  @Column(name = "net_settlement_bdt", nullable = false)
  private long netSettlementBdt;

  @Column(name = "bilateral_adjustments", nullable = false)
  private long bilateralAdjustments;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getDayLabel() {
    return dayLabel;
  }

  public void setDayLabel(String dayLabel) {
    this.dayLabel = dayLabel;
  }

  public long getGrossInBdt() {
    return grossInBdt;
  }

  public void setGrossInBdt(long grossInBdt) {
    this.grossInBdt = grossInBdt;
  }

  public long getNetSettlementBdt() {
    return netSettlementBdt;
  }

  public void setNetSettlementBdt(long netSettlementBdt) {
    this.netSettlementBdt = netSettlementBdt;
  }

  public long getBilateralAdjustments() {
    return bilateralAdjustments;
  }

  public void setBilateralAdjustments(long bilateralAdjustments) {
    this.bilateralAdjustments = bilateralAdjustments;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }
}
