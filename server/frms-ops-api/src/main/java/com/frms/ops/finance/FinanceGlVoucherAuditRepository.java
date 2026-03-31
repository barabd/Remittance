package com.frms.ops.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceGlVoucherAuditRepository extends JpaRepository<FinanceGlVoucherAuditEntity, Long> {

  List<FinanceGlVoucherAuditEntity> findByVoucherIdOrderByIdAsc(String voucherId);
}
