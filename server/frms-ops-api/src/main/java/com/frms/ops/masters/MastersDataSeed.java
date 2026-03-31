package com.frms.ops.masters;

import com.frms.ops.compliance.AmlAlertEntity;
import com.frms.ops.compliance.AmlAlertRepository;
import com.frms.ops.masters.agent.AgentAuditEntity;
import com.frms.ops.masters.agent.AgentAuditRepository;
import com.frms.ops.masters.agent.AgentEntity;
import com.frms.ops.masters.agent.AgentRepository;
import com.frms.ops.masters.beneficiary.BeneficiaryAuditEntity;
import com.frms.ops.masters.beneficiary.BeneficiaryAuditRepository;
import com.frms.ops.masters.beneficiary.BeneficiaryEntity;
import com.frms.ops.masters.beneficiary.BeneficiaryRepository;
import com.frms.ops.masters.cover.CoverFundEntity;
import com.frms.ops.masters.cover.CoverFundRepository;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class MastersDataSeed implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(MastersDataSeed.class);

  private final BeneficiaryRepository beneficiaries;
  private final BeneficiaryAuditRepository beneficiaryAudits;
  private final AgentRepository agents;
  private final AgentAuditRepository agentAudits;
  private final CoverFundRepository coverFunds;
  private final AmlAlertRepository amlAlerts;

  public MastersDataSeed(
      BeneficiaryRepository beneficiaries,
      BeneficiaryAuditRepository beneficiaryAudits,
      AgentRepository agents,
      AgentAuditRepository agentAudits,
      CoverFundRepository coverFunds,
      AmlAlertRepository amlAlerts) {
    this.beneficiaries = beneficiaries;
    this.beneficiaryAudits = beneficiaryAudits;
    this.agents = agents;
    this.agentAudits = agentAudits;
    this.coverFunds = coverFunds;
    this.amlAlerts = amlAlerts;
  }

  @Override
  public void run(String... args) {
    if (beneficiaries.count() == 0) {
      seedBeneficiaries();
      log.info("Seeded masters_beneficiary demo rows");
    }
    if (agents.count() == 0) {
      seedAgents();
      log.info("Seeded masters_agent demo rows");
    }
    if (coverFunds.count() == 0) {
      seedCover();
      log.info("Seeded masters_cover_fund demo rows");
    }
    if (amlAlerts.count() == 0) {
      seedAml();
      log.info("Seeded compliance_aml_alert demo rows");
    }
  }

  private void seedBeneficiaries() {
    var b1 = new BeneficiaryEntity();
    b1.setId("BEN-001");
    b1.setFullName("Rahim Uddin");
    b1.setPhone("+880 1711 ******");
    b1.setIdDocumentRef("NID-****2188");
    b1.setBankName("Uttara Bank PLC");
    b1.setBankAccountMasked("********4521");
    b1.setBranch("Branch-01");
    b1.setStatus("Active");
    b1.setMaker("System");
    b1.setChecker("System");
    b1.setCreatedAt("2026-03-01 10:00");
    beneficiaries.save(b1);
    beneficiaryAudit(b1.getId(), "2026-03-01 10:00", "System", "Demo seed — master record created", null);
    beneficiaryAudit(
        b1.getId(), "2026-03-01 10:05", "System", "Approved (maker-checker)", "Beneficiary cleared for payout use (Active).");
    var b2 = new BeneficiaryEntity();
    b2.setId("BEN-002");
    b2.setFullName("Karim Mia");
    b2.setPhone("+880 1812 ******");
    b2.setIdDocumentRef("NID-****9031");
    b2.setBankName("Uttara Bank PLC");
    b2.setBankAccountMasked("********8890");
    b2.setBranch("Sub-Branch-03");
    b2.setStatus("Pending Approval");
    b2.setMaker("Branch-01");
    b2.setCreatedAt("2026-03-25 11:20");
    beneficiaries.save(b2);
    beneficiaryAudit(
        b2.getId(),
        b2.getCreatedAt(),
        b2.getMaker(),
        "Registered (pending approval)",
        "Payout beneficiary submitted for maker-checker review.");
  }

  private void beneficiaryAudit(
      String beneficiaryId, String atTs, String actor, String action, String details) {
    var a = new BeneficiaryAuditEntity();
    a.setBeneficiaryId(beneficiaryId);
    a.setAtTs(atTs);
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    beneficiaryAudits.save(a);
  }

  private void seedAgents() {
    var a1 = new AgentEntity();
    a1.setId("AGT-001");
    a1.setCode("EH-DXB-01");
    a1.setName("Gulf Remit LLC");
    a1.setType("Exchange House");
    a1.setCountry("AE");
    a1.setContactPhone("+971 4 *** ****");
    a1.setStatus("Active");
    a1.setMaker("System");
    a1.setChecker("System");
    a1.setCreatedAt("2026-03-01 10:00");
    agents.save(a1);
    agentAudit(a1.getId(), "2026-03-01 10:00", "System", "Demo seed — agent / exchange house created", null);
    agentAudit(
        a1.getId(),
        "2026-03-01 10:06",
        "System",
        "Approved (maker-checker)",
        "Exchange house cleared for operations (Active).");
    var a2 = new AgentEntity();
    a2.setId("AGT-002");
    a2.setCode("EH-RUH-02");
    a2.setName("Saudi Fast Transfer");
    a2.setType("Exchange House");
    a2.setCountry("SA");
    a2.setContactPhone("+966 11 *** ****");
    a2.setStatus("Pending Approval");
    a2.setMaker("HO-Maker");
    a2.setCreatedAt("2026-03-25 09:10");
    agents.save(a2);
    agentAudit(
        a2.getId(),
        a2.getCreatedAt(),
        a2.getMaker(),
        "Registered (pending approval)",
        "Exchange house / correspondent agent submitted for maker-checker onboarding.");
  }

  private void agentAudit(String agentId, String atTs, String actor, String action, String details) {
    var a = new AgentAuditEntity();
    a.setAgentId(agentId);
    a.setAtTs(atTs);
    a.setActor(actor);
    a.setAction(action);
    a.setDetails(details);
    agentAudits.save(a);
  }

  private void seedCover() {
    var c1 = new CoverFundEntity();
    c1.setId("CF-001");
    c1.setFundCode("USD-VOSTRO-UB");
    c1.setPartnerName("Correspondent Bank A");
    c1.setCurrency("USD");
    c1.setBalanceAmount(new BigDecimal("1250000"));
    c1.setStatus("Active");
    c1.setMaker("System");
    c1.setChecker("System");
    c1.setUpdatedAt("2026-03-24 18:00");
    coverFunds.save(c1);
    var c2 = new CoverFundEntity();
    c2.setId("CF-002");
    c2.setFundCode("AED-NOSTRO-UB");
    c2.setPartnerName("Partner Treasury AE");
    c2.setCurrency("AED");
    c2.setBalanceAmount(new BigDecimal("420000"));
    c2.setStatus("Pending Approval");
    c2.setMaker("Finance-01");
    c2.setUpdatedAt("2026-03-25 08:30");
    c2.setNotes("Opening balance adjustment proposal");
    coverFunds.save(c2);
  }

  private void seedAml() {
    var x1 = new AmlAlertEntity();
    x1.setId("aml-seed-1");
    x1.setRemittanceNo("REM-2026-000186");
    x1.setScreenedAt("2026-03-25 10:33");
    x1.setMatchType("Possible");
    x1.setListName("OFAC");
    x1.setScore(82);
    x1.setStatus("Open");
    x1.setSubjectHint("Legacy seed");
    amlAlerts.save(x1);
    var x2 = new AmlAlertEntity();
    x2.setId("aml-seed-2");
    x2.setRemittanceNo("REM-2026-000172");
    x2.setScreenedAt("2026-03-25 09:50");
    x2.setMatchType("Possible");
    x2.setListName("Local");
    x2.setScore(71);
    x2.setStatus("Investigating");
    amlAlerts.save(x2);
    var x3 = new AmlAlertEntity();
    x3.setId("aml-seed-3");
    x3.setRemittanceNo("REM-2026-000160");
    x3.setScreenedAt("2026-03-25 09:05");
    x3.setMatchType("None");
    x3.setListName("OSFI");
    x3.setScore(0);
    x3.setStatus("Open");
    amlAlerts.save(x3);
  }
}
