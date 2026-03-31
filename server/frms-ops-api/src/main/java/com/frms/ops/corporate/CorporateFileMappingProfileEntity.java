package com.frms.ops.corporate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "corporate_file_mapping_profile")
public class CorporateFileMappingProfileEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 256)
  private String name;

  @Column(name = "search_field_headers_json", nullable = false, columnDefinition = "NVARCHAR(MAX)")
  private String searchFieldHeadersJson;

  @Column(name = "bulk_field_headers_json", nullable = false, columnDefinition = "NVARCHAR(MAX)")
  private String bulkFieldHeadersJson;

  @Column(name = "updated_at", nullable = false, length = 32)
  private String updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSearchFieldHeadersJson() {
    return searchFieldHeadersJson;
  }

  public void setSearchFieldHeadersJson(String searchFieldHeadersJson) {
    this.searchFieldHeadersJson = searchFieldHeadersJson;
  }

  public String getBulkFieldHeadersJson() {
    return bulkFieldHeadersJson;
  }

  public void setBulkFieldHeadersJson(String bulkFieldHeadersJson) {
    this.bulkFieldHeadersJson = bulkFieldHeadersJson;
  }

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }
}
