package com.frms.ops.ehbulkupload;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EhBulkBatchRepository extends JpaRepository<EhBulkBatchEntity, String> {
  List<EhBulkBatchEntity> findAllByOrderByCreatedAtDesc();
}
