package com.frms.ops.remittance.blocked;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EhBlockedRemittanceRepository extends JpaRepository<EhBlockedRemittanceEntity, String> {

  Optional<EhBlockedRemittanceEntity> findByRemittanceNo(String remittanceNo);

  @Modifying(clearAutomatically = true)
  @Query("delete from EhBlockedRemittanceEntity e where e.remittanceNo = :no")
  void deleteByRemittanceNo(@Param("no") String remittanceNo);
}
