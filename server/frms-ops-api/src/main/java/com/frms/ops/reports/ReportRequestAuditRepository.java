package com.frms.ops.reports;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRequestAuditRepository extends JpaRepository<ReportRequestAuditEntity, Long> {

  List<ReportRequestAuditEntity> findByReportIdOrderByIdAsc(String reportId);
}
