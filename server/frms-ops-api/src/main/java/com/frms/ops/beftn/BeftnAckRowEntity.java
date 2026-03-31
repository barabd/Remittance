package com.frms.ops.beftn;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "beftn_ack_row")
public class BeftnAckRowEntity {

  @Id
  @Column(length = 64, nullable = false)
  private String id;

  @Column(name = "ack_file_id", length = 64, nullable = false)
  private String ackFileId;

  @Column(name = "line_no", nullable = false)
  private int lineNo;

  @Column(name = "batch_ref", length = 128)
  private String batchRef;

  @Column(name = "txn_ref", length = 128)
  private String txnRef;

  @Column(name = "remittance_no", length = 64)
  private String remittanceNo;

  @Column(name = "amount_bdt", length = 64)
  private String amountBdt;

  @Column(name = "ack_status", length = 64)
  private String ackStatus;

  @Column(name = "value_date", length = 32)
  private String valueDate;

  @Column(name = "raw_line", columnDefinition = "NVARCHAR(MAX)", nullable = false)
  private String rawLine;

  @Column(name = "parse_status", length = 32, nullable = false)
  private String parseStatus;

  @Column(name = "parse_message", length = 512)
  private String parseMessage;

  @Column(name = "matched_disbursement_id", length = 64)
  private String matchedDisbursementId;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getAckFileId() {
    return ackFileId;
  }

  public void setAckFileId(String ackFileId) {
    this.ackFileId = ackFileId;
  }

  public int getLineNo() {
    return lineNo;
  }

  public void setLineNo(int lineNo) {
    this.lineNo = lineNo;
  }

  public String getBatchRef() {
    return batchRef;
  }

  public void setBatchRef(String batchRef) {
    this.batchRef = batchRef;
  }

  public String getTxnRef() {
    return txnRef;
  }

  public void setTxnRef(String txnRef) {
    this.txnRef = txnRef;
  }

  public String getRemittanceNo() {
    return remittanceNo;
  }

  public void setRemittanceNo(String remittanceNo) {
    this.remittanceNo = remittanceNo;
  }

  public String getAmountBdt() {
    return amountBdt;
  }

  public void setAmountBdt(String amountBdt) {
    this.amountBdt = amountBdt;
  }

  public String getAckStatus() {
    return ackStatus;
  }

  public void setAckStatus(String ackStatus) {
    this.ackStatus = ackStatus;
  }

  public String getValueDate() {
    return valueDate;
  }

  public void setValueDate(String valueDate) {
    this.valueDate = valueDate;
  }

  public String getRawLine() {
    return rawLine;
  }

  public void setRawLine(String rawLine) {
    this.rawLine = rawLine;
  }

  public String getParseStatus() {
    return parseStatus;
  }

  public void setParseStatus(String parseStatus) {
    this.parseStatus = parseStatus;
  }

  public String getParseMessage() {
    return parseMessage;
  }

  public void setParseMessage(String parseMessage) {
    this.parseMessage = parseMessage;
  }

  public String getMatchedDisbursementId() {
    return matchedDisbursementId;
  }

  public void setMatchedDisbursementId(String matchedDisbursementId) {
    this.matchedDisbursementId = matchedDisbursementId;
  }
}
