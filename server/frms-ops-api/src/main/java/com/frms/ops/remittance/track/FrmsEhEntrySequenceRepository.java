package com.frms.ops.remittance.track;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FrmsEhEntrySequenceRepository extends JpaRepository<FrmsEhEntrySequenceEntity, String> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from FrmsEhEntrySequenceEntity e where e.id = :id")
  Optional<FrmsEhEntrySequenceEntity> findByIdForUpdate(@Param("id") String id);
}
