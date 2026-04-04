package com.frms.ops.security.directory;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_sec_directory_user")
public class DirectoryUserEntity {

  @Id
  @Column(length = 50)
  public String id;

  public String username;

  @Column(name = "full_name")
  public String fullName;

  public String role;
  public String branch;
  public String realm;

  @Column(name = "eh_branch_unit")
  public String ehBranchUnit;

  public String status;
  public String maker;
  public String checker;

  @Column(name = "created_at")
  public String createdAt;

  @Column(name = "employee_id")
  public String employeeId;

  @Column(name = "financial_txn_limit_bdt")
  public long financialTxnLimitBdt;

  @Column(name = "ho_funding_limit_bdt")
  public long hoFundingLimitBdt;

  /** Comma-separated module keys (e.g. dashboard,remittance,finance). */
  public String rights;

  /** BCrypt hash; never exposed in JSON API responses. */
  @JsonIgnore
  @Column(name = "password_hash", length = 120)
  public String passwordHash;
}
