package com.frms.ops.compliance;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import com.frms.ops.outbox.EmailOutboxRepository;
import com.frms.ops.outbox.EmailOutboxRow;
import com.frms.ops.remittance.track.RemittanceRecordEntity;
import com.frms.ops.remittance.track.RemittanceRecordRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ComplianceRulesController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(
    properties = {"frms.ops.mail.enabled=false", "frms.security.enabled=false"})
class ComplianceRulesControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private FrmsMlaSettingsRepository mlaRepo;
  @MockBean private RemittanceRecordRepository remittanceRepo;
  @MockBean private AmlAlertRepository amlRepo;
  @MockBean private EmailOutboxRepository outboxRepo;

  @Test
  void readiness_returnsLiveSnapshot() throws Exception {
    var settings = new FrmsMlaSettingsEntity();
    settings.setId(FrmsMlaSettingsEntity.SINGLETON_ID);
    settings.setScreeningMode("mock_vendor_api");

    var pending = new RemittanceRecordEntity();
    pending.setStatus("Pending Approval");
    var approved = new RemittanceRecordEntity();
    approved.setStatus("Approved");

    var open = new AmlAlertEntity();
    open.setStatus("Open");
    var investigating = new AmlAlertEntity();
    investigating.setStatus("Investigating");

    var queued = new EmailOutboxRow();
    queued.setStatus("queued");
    var sent = new EmailOutboxRow();
    sent.setStatus("sent");

    when(mlaRepo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(settings));
    when(remittanceRepo.count()).thenReturn(2L);
    when(remittanceRepo.findAll()).thenReturn(List.of(pending, approved));
    when(amlRepo.findAll()).thenReturn(List.of(open, investigating));
    when(outboxRepo.findAll()).thenReturn(List.of(queued, sent));

    mockMvc
        .perform(get("/compliance/rules/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.backend.ok", is(true)))
        .andExpect(jsonPath("$.database.mlaSettingsSeeded", is(true)))
        .andExpect(jsonPath("$.database.screeningMode", is("mock_vendor_api")))
        .andExpect(jsonPath("$.database.remittanceRecordCount", is(2)))
        .andExpect(jsonPath("$.database.remittancePendingApprovalCount", is(1)))
        .andExpect(jsonPath("$.database.amlAlertOpenCount", is(1)))
        .andExpect(jsonPath("$.database.emailOutboxQueuedCount", is(1)))
        .andExpect(jsonPath("$.integrations.smtpEnabled", is(false)))
        .andExpect(jsonPath("$.integrations.emailOutboxMode", is("audit_only")));
  }
}
