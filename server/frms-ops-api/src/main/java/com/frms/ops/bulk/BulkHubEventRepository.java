package com.frms.ops.bulk;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BulkHubEventRepository extends JpaRepository<BulkHubEventEntity, String> {}
