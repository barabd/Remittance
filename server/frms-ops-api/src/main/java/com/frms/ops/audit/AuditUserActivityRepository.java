package com.frms.ops.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditUserActivityRepository extends JpaRepository<AuditUserActivityEntity, String> {
  List<AuditUserActivityEntity> findAllByOrderByAtDesc();
}
