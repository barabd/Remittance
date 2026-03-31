package com.frms.ops.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** FX range band — table {@code pricing_fx_range_band}. */
@Entity
@Table(name = "pricing_fx_range_band")
public class PricingFxRangeEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 128)
  private String label;

  @Column(name = "from_currency", nullable = false, length = 8)
  private String fromCurrency;

  @Column(name = "to_currency", nullable = false, length = 8)
  private String toCurrency;

  @Column(name = "min_amount_from", nullable = false)
  private double minAmountFrom;

  @Column(name = "max_amount_from", nullable = false)
  private double maxAmountFrom;

  @Column(nullable = false)
  private double rate;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getLabel() { return label; }
  public void setLabel(String label) { this.label = label; }

  public String getFromCurrency() { return fromCurrency; }
  public void setFromCurrency(String fromCurrency) { this.fromCurrency = fromCurrency; }

  public String getToCurrency() { return toCurrency; }
  public void setToCurrency(String toCurrency) { this.toCurrency = toCurrency; }

  public double getMinAmountFrom() { return minAmountFrom; }
  public void setMinAmountFrom(double minAmountFrom) { this.minAmountFrom = minAmountFrom; }

  public double getMaxAmountFrom() { return maxAmountFrom; }
  public void setMaxAmountFrom(double maxAmountFrom) { this.maxAmountFrom = maxAmountFrom; }

  public double getRate() { return rate; }
  public void setRate(double rate) { this.rate = rate; }

  public String getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
