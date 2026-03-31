package com.frms.ops.masters.beneficiary;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeneficiaryAuditRepository extends JpaRepository<BeneficiaryAuditEntity, Long> {

  List<BeneficiaryAuditEntity> findByBeneficiaryIdOrderByIdAsc(String beneficiaryId);
}
