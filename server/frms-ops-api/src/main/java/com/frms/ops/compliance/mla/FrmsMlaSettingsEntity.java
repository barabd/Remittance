package com.frms.ops.compliance.mla;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frms_mla_settings")
public class FrmsMlaSettingsEntity {

  public static final String SINGLETON_ID = "default";

  @Id
  @Column(length = 16)
  private String id;

  @Column(name = "screening_mode", nullable = false, length = 32)
  private String screeningMode;

  @Column(name = "require_photo_id", nullable = false)
  private boolean requirePhotoId;

  @Column(name = "max_remittances_per_remitter_per_day", nullable = false)
  private int maxRemittancesPerRemitterPerDay;

  @Column(name = "max_bdt_total_per_remitter_per_day", nullable = false)
  private long maxBdtTotalPerRemitterPerDay;

  @Column(name = "pattern_one_to_many_min", nullable = false)
  private int patternOneToManyMin;

  @Column(name = "pattern_many_to_one_min", nullable = false)
  private int patternManyToOneMin;

  @Column(name = "block_approval_on_business_term", nullable = false)
  private boolean blockApprovalOnBusinessTerm;

  @Column(name = "block_approval_on_pattern", nullable = false)
  private boolean blockApprovalOnPattern;

  @Column(name = "block_approval_on_primary_aml_hit", nullable = false)
  private boolean blockApprovalOnPrimaryAmlHit;

  @Column(name = "block_approval_on_opac_dsri_hit", nullable = false)
  private boolean blockApprovalOnOpacDsriHit;

  @Column(name = "auto_screen_on_search_import", nullable = false)
  private boolean autoScreenOnSearchImport;

  @Column(name = "country_keywords_json", nullable = false, length = 4000)
  private String countryKeywordsJson;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public boolean isRequirePhotoId() {
    return requirePhotoId;
  }

  public String getScreeningMode() {
    return screeningMode;
  }

  public void setScreeningMode(String screeningMode) {
    this.screeningMode = screeningMode;
  }

  public void setRequirePhotoId(boolean requirePhotoId) {
    this.requirePhotoId = requirePhotoId;
  }

  public int getMaxRemittancesPerRemitterPerDay() {
    return maxRemittancesPerRemitterPerDay;
  }

  public void setMaxRemittancesPerRemitterPerDay(int maxRemittancesPerRemitterPerDay) {
    this.maxRemittancesPerRemitterPerDay = maxRemittancesPerRemitterPerDay;
  }

  public long getMaxBdtTotalPerRemitterPerDay() {
    return maxBdtTotalPerRemitterPerDay;
  }

  public void setMaxBdtTotalPerRemitterPerDay(long maxBdtTotalPerRemitterPerDay) {
    this.maxBdtTotalPerRemitterPerDay = maxBdtTotalPerRemitterPerDay;
  }

  public int getPatternOneToManyMin() {
    return patternOneToManyMin;
  }

  public void setPatternOneToManyMin(int patternOneToManyMin) {
    this.patternOneToManyMin = patternOneToManyMin;
  }

  public int getPatternManyToOneMin() {
    return patternManyToOneMin;
  }

  public void setPatternManyToOneMin(int patternManyToOneMin) {
    this.patternManyToOneMin = patternManyToOneMin;
  }

  public boolean isBlockApprovalOnBusinessTerm() {
    return blockApprovalOnBusinessTerm;
  }

  public void setBlockApprovalOnBusinessTerm(boolean blockApprovalOnBusinessTerm) {
    this.blockApprovalOnBusinessTerm = blockApprovalOnBusinessTerm;
  }

  public boolean isBlockApprovalOnPattern() {
    return blockApprovalOnPattern;
  }

  public void setBlockApprovalOnPattern(boolean blockApprovalOnPattern) {
    this.blockApprovalOnPattern = blockApprovalOnPattern;
  }

  public boolean isBlockApprovalOnPrimaryAmlHit() {
    return blockApprovalOnPrimaryAmlHit;
  }

  public void setBlockApprovalOnPrimaryAmlHit(boolean blockApprovalOnPrimaryAmlHit) {
    this.blockApprovalOnPrimaryAmlHit = blockApprovalOnPrimaryAmlHit;
  }

  public boolean isBlockApprovalOnOpacDsriHit() {
    return blockApprovalOnOpacDsriHit;
  }

  public void setBlockApprovalOnOpacDsriHit(boolean blockApprovalOnOpacDsriHit) {
    this.blockApprovalOnOpacDsriHit = blockApprovalOnOpacDsriHit;
  }

  public boolean isAutoScreenOnSearchImport() {
    return autoScreenOnSearchImport;
  }

  public void setAutoScreenOnSearchImport(boolean autoScreenOnSearchImport) {
    this.autoScreenOnSearchImport = autoScreenOnSearchImport;
  }

  public String getCountryKeywordsJson() {
    return countryKeywordsJson;
  }

  public void setCountryKeywordsJson(String countryKeywordsJson) {
    this.countryKeywordsJson = countryKeywordsJson;
  }
}
