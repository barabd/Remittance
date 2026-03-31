package com.frms.ops.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Finance General Ledger voucher row.
 * Table {@code finance_gl_voucher} — auto-created by Hibernate ({@code ddl-auto: update}).
 */
@Entity
@Table(name = "finance_gl_voucher")
public class FinanceGlVoucherEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(name = "voucher_no", nullable = false, length = 64)
  private String voucherNo;

  /** yyyy-MM-dd */
  @Column(name = "voucher_date", nullable = false, length = 16)
  private String voucherDate;

  /** Cash | Bank | Journal | Petty */
  @Column(nullable = false, length = 16)
  private String type;

  @Column(nullable = false, length = 512)
  private String narration;

  @Column(nullable = false)
  private double debit;

  @Column(nullable = false)
  private double credit;

  @Column(name = "vat_amount", nullable = false)
  private double vatAmount;

  @Column(nullable = false, length = 128)
  private String branch;

  @Column(nullable = false, length = 128)
  private String maker;

  @Column(length = 128)
  private String checker;

  /** Draft | Pending Approval | Approved | Posted | Rejected | On Hold */
  @Column(nullable = false, length = 32)
  private String status;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getVoucherNo() { return voucherNo; }
  public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

  public String getVoucherDate() { return voucherDate; }
  public void setVoucherDate(String voucherDate) { this.voucherDate = voucherDate; }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getNarration() { return narration; }
  public void setNarration(String narration) { this.narration = narration; }

  public double getDebit() { return debit; }
  public void setDebit(double debit) { this.debit = debit; }

  public double getCredit() { return credit; }
  public void setCredit(double credit) { this.credit = credit; }

  public double getVatAmount() { return vatAmount; }
  public void setVatAmount(double vatAmount) { this.vatAmount = vatAmount; }

  public String getBranch() { return branch; }
  public void setBranch(String branch) { this.branch = branch; }

  public String getMaker() { return maker; }
  public void setMaker(String maker) { this.maker = maker; }

  public String getChecker() { return checker; }
  public void setChecker(String checker) { this.checker = checker; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
}
