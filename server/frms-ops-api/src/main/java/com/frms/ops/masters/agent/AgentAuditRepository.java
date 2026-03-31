package com.frms.ops.masters.agent;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentAuditRepository extends JpaRepository<AgentAuditEntity, Long> {

  List<AgentAuditEntity> findByAgentIdOrderByIdAsc(String agentId);
}
