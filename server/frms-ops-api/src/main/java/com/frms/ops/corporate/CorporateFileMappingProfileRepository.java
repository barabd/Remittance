package com.frms.ops.corporate;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CorporateFileMappingProfileRepository
    extends JpaRepository<CorporateFileMappingProfileEntity, String> {

  List<CorporateFileMappingProfileEntity> findAllByOrderByUpdatedAtDesc();
}
