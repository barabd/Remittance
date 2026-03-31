package com.frms.ops.compliance.risk;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiskControlProfileRepository extends JpaRepository<RiskControlProfileEntity, String> {

  List<RiskControlProfileEntity> findAllByOrderByUpdatedAtDesc();

  Optional<RiskControlProfileEntity> findFirstByCustomerNameIgnoreCase(String customerName);

  boolean existsByCustomerNameIgnoreCaseAndIdNot(String customerName, String id);
}
