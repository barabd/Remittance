package com.frms.ops.masters.cover;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoverFundAuditRepository extends JpaRepository<CoverFundAuditEntity, Long> {

  List<CoverFundAuditEntity> findByCoverFundIdOrderByIdAsc(String coverFundId);
}
