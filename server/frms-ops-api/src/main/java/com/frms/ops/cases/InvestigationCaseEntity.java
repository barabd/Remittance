package com.frms.ops.cases;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "investigation_case")
public class InvestigationCaseEntity {

  @Id
  @Column(length = 64)
  private String id;

  @Column(nullable = false, length = 512)
  private String title;

  @Column(nullable = false, length = 32)
  private String source;

  @Column(length = 128)
  private String ref;

  @Column(length = 256)
  private String subject;

  @Column(nullable = false, length = 16)
  private String priority;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(nullable = false, length = 128)
  private String assignee;

  @Column(name = "created_at", nullable = false, length = 32)
  private String createdAt;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "investigation_case_note", joinColumns = @JoinColumn(name = "case_id"))
  @OrderColumn(name = "note_order")
  private List<CaseNoteEmbeddable> notes = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getRef() {
    return ref;
  }

  public void setRef(String ref) {
    this.ref = ref;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public String getPriority() {
    return priority;
  }

  public void setPriority(String priority) {
    this.priority = priority;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getAssignee() {
    return assignee;
  }

  public void setAssignee(String assignee) {
    this.assignee = assignee;
  }

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }

  public List<CaseNoteEmbeddable> getNotes() {
    return notes;
  }

  public void setNotes(List<CaseNoteEmbeddable> notes) {
    this.notes = notes != null ? notes : new ArrayList<>();
  }
}
