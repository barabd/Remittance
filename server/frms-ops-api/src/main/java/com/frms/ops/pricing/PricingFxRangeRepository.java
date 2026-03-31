package com.frms.ops.pricing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingFxRangeRepository extends JpaRepository<PricingFxRangeEntity, String> {
  List<PricingFxRangeEntity> findAllByOrderByUpdatedAtDesc();
}
