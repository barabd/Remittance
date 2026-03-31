package com.frms.ops.pricing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingBankFxRepository extends JpaRepository<PricingBankFxEntity, String> {
  List<PricingBankFxEntity> findAllByOrderByUpdatedAtDesc();
}
