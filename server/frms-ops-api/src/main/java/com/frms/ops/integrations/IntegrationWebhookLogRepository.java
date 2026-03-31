package com.frms.ops.integrations;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IntegrationWebhookLogRepository extends JpaRepository<IntegrationWebhookLogEntity, String> {
    List<IntegrationWebhookLogEntity> findAllByOrderByRecordedAtDesc();
}
