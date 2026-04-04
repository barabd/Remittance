package com.frms.ops.security.directory;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DirectoryUserRepository extends JpaRepository<DirectoryUserEntity, String> {

  Optional<DirectoryUserEntity> findByUsername(String username);

  List<DirectoryUserEntity> findAllByOrderByCreatedAtDesc();
}
