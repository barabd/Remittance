package com.frms.ops.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Commission band — table {@code pricing_commission_band}. */
@Entity
@Table(name = "pricing_commission_band")
public class PricingCommissionEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 128)
  private String label;

  @Column(name = "currency_pair", nullable = false, length = 16)
  private String currencyPair;

  /** Any | Cash | Deposit Slip | Credit/Debit Card */
  @Column(name = "commission_for", nullable = false, length = 32)
  private String commissionFor;

  @Column(name = "min_amount", nullable = false)
  private double minAmount;

  @Column(name = "max_amount", nullable = false)
  private double maxAmount;

  @Column(name = "commission_pct", nullable = false)
  private double commissionPct;

  @Column(name = "flat_fee", nullable = false)
  private double flatFee;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getLabel() { return label; }
  public void setLabel(String label) { this.label = label; }

  public String getCurrencyPair() { return currencyPair; }
  public void setCurrencyPair(String currencyPair) { this.currencyPair = currencyPair; }

  public String getCommissionFor() { return commissionFor; }
  public void setCommissionFor(String commissionFor) { this.commissionFor = commissionFor; }

  public double getMinAmount() { return minAmount; }
  public void setMinAmount(double minAmount) { this.minAmount = minAmount; }

  public double getMaxAmount() { return maxAmount; }
  public void setMaxAmount(double maxAmount) { this.maxAmount = maxAmount; }

  public double getCommissionPct() { return commissionPct; }
  public void setCommissionPct(double commissionPct) { this.commissionPct = commissionPct; }

  public double getFlatFee() { return flatFee; }
  public void setFlatFee(double flatFee) { this.flatFee = flatFee; }

  public String getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
