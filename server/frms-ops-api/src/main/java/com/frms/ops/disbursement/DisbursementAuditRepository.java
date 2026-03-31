package com.frms.ops.disbursement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisbursementAuditRepository extends JpaRepository<DisbursementAuditEntity, Long> {

  List<DisbursementAuditEntity> findByDisbursementIdOrderByIdAsc(String disbursementId);
}
