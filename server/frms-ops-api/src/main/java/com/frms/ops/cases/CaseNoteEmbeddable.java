package com.frms.ops.cases;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class CaseNoteEmbeddable {

  @Column(name = "note_at", nullable = false, length = 32)
  private String at;

  @Column(name = "note_by", nullable = false, length = 128)
  private String byUser;

  @Column(name = "note_text", nullable = false, length = 4000)
  private String text;

  public String getAt() {
    return at;
  }

  public void setAt(String at) {
    this.at = at;
  }

  public String getByUser() {
    return byUser;
  }

  public void setByUser(String byUser) {
    this.byUser = byUser;
  }

  public String getText() {
    return text;
  }

  public void setText(String text) {
    this.text = text;
  }
}
