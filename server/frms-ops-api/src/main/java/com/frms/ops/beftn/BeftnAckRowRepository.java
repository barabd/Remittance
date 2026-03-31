package com.frms.ops.beftn;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeftnAckRowRepository extends JpaRepository<BeftnAckRowEntity, String> {

  List<BeftnAckRowEntity> findByAckFileIdOrderByLineNoAsc(String ackFileId);
}
