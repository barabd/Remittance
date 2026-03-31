package com.frms.ops.notification;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpsNotificationRepository extends JpaRepository<OpsNotification, String> {

  List<OpsNotification> findAllByOrderByCreatedAtDesc();
}
