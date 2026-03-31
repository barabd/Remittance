package com.frms.ops.integrations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_integration_connector")
public class IntegrationConnectorEntity {
  @Id
  @Column(length = 50)
  private String id;

  @Column(nullable = false, length = 50)
  private String category;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, length = 50)
  private String region;

  @Column(nullable = false, length = 50)
  private String protocol;

  @Column(nullable = false, length = 50)
  private String status;

  @Column(name = "last_sync", length = 50)
  private String lastSync;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String notes;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getProtocol() { return protocol; }
  public void setProtocol(String protocol) { this.protocol = protocol; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getLastSync() { return lastSync; }
  public void setLastSync(String lastSync) { this.lastSync = lastSync; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
