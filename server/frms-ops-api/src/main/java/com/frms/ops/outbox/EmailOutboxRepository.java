package com.frms.ops.outbox;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailOutboxRepository extends JpaRepository<EmailOutboxRow, String> {

  List<EmailOutboxRow> findAllByOrderByCreatedAtDesc();
}
