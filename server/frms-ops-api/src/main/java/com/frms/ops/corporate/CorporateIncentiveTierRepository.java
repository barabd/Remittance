package com.frms.ops.corporate;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CorporateIncentiveTierRepository extends JpaRepository<CorporateIncentiveTierEntity, String> {

  List<CorporateIncentiveTierEntity> findAllByOrderByMinBdtEquivalentAsc();
}
