package com.frms.ops.settlementreg;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settlement_bilateral_position")
public class SettlementBilateralPositionEntity {

  @Id
  @Column(length = 32)
  private String id;

  @Column(nullable = false, length = 256)
  private String counterparty;

  @Column(nullable = false, length = 128)
  private String corridor;

  @Column(name = "net_position_bdt", nullable = false)
  private long netPositionBdt;

  @Column(name = "as_of", nullable = false, length = 32)
  private String asOf;

  @Column(name = "multilateral_bucket", nullable = false, length = 64)
  private String multilateralBucket;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getCounterparty() {
    return counterparty;
  }

  public void setCounterparty(String counterparty) {
    this.counterparty = counterparty;
  }

  public String getCorridor() {
    return corridor;
  }

  public void setCorridor(String corridor) {
    this.corridor = corridor;
  }

  public long getNetPositionBdt() {
    return netPositionBdt;
  }

  public void setNetPositionBdt(long netPositionBdt) {
    this.netPositionBdt = netPositionBdt;
  }

  public String getAsOf() {
    return asOf;
  }

  public void setAsOf(String asOf) {
    this.asOf = asOf;
  }

  public String getMultilateralBucket() {
    return multilateralBucket;
  }

  public void setMultilateralBucket(String multilateralBucket) {
    this.multilateralBucket = multilateralBucket;
  }
}
