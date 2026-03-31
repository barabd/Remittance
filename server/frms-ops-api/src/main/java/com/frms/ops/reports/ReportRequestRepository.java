package com.frms.ops.reports;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRequestRepository extends JpaRepository<ReportRequestEntity, String> {

  List<ReportRequestEntity> findAllByOrderByGeneratedAtDescIdDesc();
}
