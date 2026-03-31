package com.frms.ops.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Bank-specific FX rate — table {@code pricing_bank_fx_rate}. */
@Entity
@Table(name = "pricing_bank_fx_rate")
public class PricingBankFxEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "bank_code", nullable = false, length = 64)
  private String bankCode;

  @Column(name = "bank_name", nullable = false, length = 256)
  private String bankName;

  @Column(name = "from_currency", nullable = false, length = 8)
  private String fromCurrency;

  @Column(name = "to_currency", nullable = false, length = 8)
  private String toCurrency;

  @Column(nullable = false)
  private double rate;

  @Column(name = "commission_pct", nullable = false)
  private double commissionPct;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getBankCode() { return bankCode; }
  public void setBankCode(String bankCode) { this.bankCode = bankCode; }

  public String getBankName() { return bankName; }
  public void setBankName(String bankName) { this.bankName = bankName; }

  public String getFromCurrency() { return fromCurrency; }
  public void setFromCurrency(String fromCurrency) { this.fromCurrency = fromCurrency; }

  public String getToCurrency() { return toCurrency; }
  public void setToCurrency(String toCurrency) { this.toCurrency = toCurrency; }

  public double getRate() { return rate; }
  public void setRate(double rate) { this.rate = rate; }

  public double getCommissionPct() { return commissionPct; }
  public void setCommissionPct(double commissionPct) { this.commissionPct = commissionPct; }

  public String getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
