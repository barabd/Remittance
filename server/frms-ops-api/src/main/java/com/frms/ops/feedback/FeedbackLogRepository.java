package com.frms.ops.feedback;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackLogRepository extends JpaRepository<FeedbackLogRow, String> {

  List<FeedbackLogRow> findAllByOrderByLoggedAtDesc();
}
