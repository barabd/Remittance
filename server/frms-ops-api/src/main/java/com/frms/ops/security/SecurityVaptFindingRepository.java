package com.frms.ops.security;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecurityVaptFindingRepository extends JpaRepository<SecurityVaptFindingEntity, Long> {

  List<SecurityVaptFindingEntity> findAllByOrderByCreatedAtDesc();
}
