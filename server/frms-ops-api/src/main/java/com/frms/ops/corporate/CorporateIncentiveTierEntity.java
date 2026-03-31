package com.frms.ops.corporate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "corporate_incentive_tier")
public class CorporateIncentiveTierEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 256)
  private String label;

  @Column(name = "min_bdt_equivalent", nullable = false)
  private double minBdtEquivalent;

  @Column(name = "max_bdt_equivalent", nullable = false)
  private double maxBdtEquivalent;

  @Column(name = "pct_of_principal", nullable = false)
  private double pctOfPrincipal;

  @Column(name = "flat_bdt", nullable = false)
  private double flatBdt;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public double getMinBdtEquivalent() {
    return minBdtEquivalent;
  }

  public void setMinBdtEquivalent(double minBdtEquivalent) {
    this.minBdtEquivalent = minBdtEquivalent;
  }

  public double getMaxBdtEquivalent() {
    return maxBdtEquivalent;
  }

  public void setMaxBdtEquivalent(double maxBdtEquivalent) {
    this.maxBdtEquivalent = maxBdtEquivalent;
  }

  public double getPctOfPrincipal() {
    return pctOfPrincipal;
  }

  public void setPctOfPrincipal(double pctOfPrincipal) {
    this.pctOfPrincipal = pctOfPrincipal;
  }

  public double getFlatBdt() {
    return flatBdt;
  }

  public void setFlatBdt(double flatBdt) {
    this.flatBdt = flatBdt;
  }

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }
}
