package com.frms.ops.outbox;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SmsOutboxRepository extends JpaRepository<SmsOutboxRow, String> {

  List<SmsOutboxRow> findAllByOrderByCreatedAtDesc();
}
