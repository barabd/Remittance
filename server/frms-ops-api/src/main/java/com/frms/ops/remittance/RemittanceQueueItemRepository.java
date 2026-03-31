package com.frms.ops.remittance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RemittanceQueueItemRepository extends JpaRepository<RemittanceQueueItemEntity, String> {

  List<RemittanceQueueItemEntity> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
