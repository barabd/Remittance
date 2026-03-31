package com.frms.ops.security;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecurityUtilityEventRepository extends JpaRepository<SecurityUtilityEventEntity, Long> {

  List<SecurityUtilityEventEntity> findTop50ByOrderByCreatedAtDesc();
}
