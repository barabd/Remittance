package com.frms.ops.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminPrivilegedAuditRepository extends JpaRepository<AdminPrivilegedAuditEntity, String> {
  List<AdminPrivilegedAuditEntity> findAllByOrderByAtDesc();
}
