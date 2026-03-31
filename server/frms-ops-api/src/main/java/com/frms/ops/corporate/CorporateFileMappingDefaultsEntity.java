package com.frms.ops.corporate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "corporate_file_mapping_defaults")
public class CorporateFileMappingDefaultsEntity {

  @Id
  private Integer id;

  @Column(name = "default_search_profile_id", nullable = false, length = 64)
  private String defaultSearchProfileId;

  @Column(name = "default_bulk_profile_id", nullable = false, length = 64)
  private String defaultBulkProfileId;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public Integer getId() {
    return id;
  }

  public void setId(Integer id) {
    this.id = id;
  }

  public String getDefaultSearchProfileId() {
    return defaultSearchProfileId;
  }

  public void setDefaultSearchProfileId(String defaultSearchProfileId) {
    this.defaultSearchProfileId = defaultSearchProfileId;
  }

  public String getDefaultBulkProfileId() {
    return defaultBulkProfileId;
  }

  public void setDefaultBulkProfileId(String defaultBulkProfileId) {
    this.defaultBulkProfileId = defaultBulkProfileId;
  }

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }
}
