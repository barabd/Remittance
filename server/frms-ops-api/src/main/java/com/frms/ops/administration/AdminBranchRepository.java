package com.frms.ops.administration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminBranchRepository extends JpaRepository<AdminBranchEntity, String> {
  List<AdminBranchEntity> findAllByOrderByCreatedAtDesc();
  List<AdminBranchEntity> findByStatus(String status);
}
