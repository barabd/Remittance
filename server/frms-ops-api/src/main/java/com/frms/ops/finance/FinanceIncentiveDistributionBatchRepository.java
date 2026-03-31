package com.frms.ops.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceIncentiveDistributionBatchRepository
    extends JpaRepository<FinanceIncentiveDistributionBatchEntity, String> {

  List<FinanceIncentiveDistributionBatchEntity> findAllByOrderByUpdatedAtDescIdDesc();

  boolean existsByExchangeHouseAndPeriod(String exchangeHouse, String period);
}
