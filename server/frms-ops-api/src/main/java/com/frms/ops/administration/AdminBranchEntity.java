package com.frms.ops.administration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Organization branch/unit master data (A.1.1: Admin Dashboard).
 * Table: frms_admin_branch
 */
@Entity
@Table(name = "frms_admin_branch")
public class AdminBranchEntity {

  @Id
  @Column(length = 50)
  private String id;

  @Column(name = "branch_code", nullable = false, length = 50)
  private String branchCode;

  @Column(name = "branch_name", nullable = false, length = 100)
  private String branchName;

  @Column(nullable = false, length = 50)
  private String type; // "HO", "Branch", "Sub-Branch", "Agent"

  @Column(nullable = false, length = 100)
  private String district;

  @Column(nullable = false, length = 50)
  private String status; // "Active", "Inactive", "Pending Approval"

  @Column(nullable = false, length = 50)
  private String maker;

  @Column(length = 50)
  private String checker;

  @Column(name = "created_at", nullable = false, length = 50)
  private String createdAt;

  public AdminBranchEntity() {}

  // Getters & Setters
  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getBranchCode() { return branchCode; }
  public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

  public String getBranchName() { return branchName; }
  public void setBranchName(String branchName) { this.branchName = branchName; }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getDistrict() { return district; }
  public void setDistrict(String district) { this.district = district; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getMaker() { return maker; }
  public void setMaker(String maker) { this.maker = maker; }

  public String getChecker() { return checker; }
  public void setChecker(String checker) { this.checker = checker; }

  public String getCreatedAt() { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
