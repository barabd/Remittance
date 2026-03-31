package com.frms.ops.reconciliation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationExceptionRepository
    extends JpaRepository<ReconciliationExceptionEntity, String> {

  List<ReconciliationExceptionEntity> findAllByOrderByDetectedAtDesc();
}
