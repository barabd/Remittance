package com.frms.ops.ehbulkupload;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EhBulkRowRepository extends JpaRepository<EhBulkRowEntity, String> {
  List<EhBulkRowEntity> findByBatchIdOrderByRowNoAsc(String batchId);
}
