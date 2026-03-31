package com.frms.ops.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinanceGlVoucherRepository extends JpaRepository<FinanceGlVoucherEntity, String> {

  List<FinanceGlVoucherEntity> findAllByOrderByVoucherDateDescIdDesc();
}
