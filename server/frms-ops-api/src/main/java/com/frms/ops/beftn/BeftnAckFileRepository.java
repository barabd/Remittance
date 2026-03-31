package com.frms.ops.beftn;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeftnAckFileRepository extends JpaRepository<BeftnAckFileEntity, String> {

  List<BeftnAckFileEntity> findAllByOrderByUploadedAtDesc();
}
