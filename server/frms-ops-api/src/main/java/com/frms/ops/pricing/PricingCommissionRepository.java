package com.frms.ops.pricing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingCommissionRepository extends JpaRepository<PricingCommissionEntity, String> {
  List<PricingCommissionEntity> findAllByOrderByUpdatedAtDesc();
}
