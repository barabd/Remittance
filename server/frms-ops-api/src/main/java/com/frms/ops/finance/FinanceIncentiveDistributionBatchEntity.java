package com.frms.ops.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "finance_incentive_distribution_batch")
public class FinanceIncentiveDistributionBatchEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "exchange_house", nullable = false, length = 128)
  private String exchangeHouse;

  @Column(name = "period_ym", nullable = false, length = 16)
  private String period;

  @Column(name = "total_incentive_bdt", nullable = false)
  private double totalIncentiveBdt;

  @Column(name = "remittance_count", nullable = false)
  private int remittanceCount;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 32)
  private String channel;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getExchangeHouse() { return exchangeHouse; }
  public void setExchangeHouse(String exchangeHouse) { this.exchangeHouse = exchangeHouse; }

  public String getPeriod() { return period; }
  public void setPeriod(String period) { this.period = period; }

  public double getTotalIncentiveBdt() { return totalIncentiveBdt; }
  public void setTotalIncentiveBdt(double totalIncentiveBdt) { this.totalIncentiveBdt = totalIncentiveBdt; }

  public int getRemittanceCount() { return remittanceCount; }
  public void setRemittanceCount(int remittanceCount) { this.remittanceCount = remittanceCount; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getChannel() { return channel; }
  public void setChannel(String channel) { this.channel = channel; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
