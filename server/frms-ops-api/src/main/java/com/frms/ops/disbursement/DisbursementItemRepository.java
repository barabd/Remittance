package com.frms.ops.disbursement;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisbursementItemRepository extends JpaRepository<DisbursementItemEntity, String> {

	Optional<DisbursementItemEntity> findFirstByPayoutRefIgnoreCase(String payoutRef);

	Optional<DisbursementItemEntity> findFirstByRemittanceNoIgnoreCase(String remittanceNo);
}
