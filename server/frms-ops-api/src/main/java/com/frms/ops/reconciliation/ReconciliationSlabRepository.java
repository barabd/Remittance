package com.frms.ops.reconciliation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationSlabRepository extends JpaRepository<ReconciliationSlabEntity, String> {

  List<ReconciliationSlabEntity> findAllByOrderByChannelAscIdAsc();
}
