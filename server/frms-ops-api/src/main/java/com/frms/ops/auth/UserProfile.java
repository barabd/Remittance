package com.frms.ops.auth;

import com.frms.ops.security.directory.DirectoryUserEntity;
import java.util.Arrays;
import java.util.List;

public record UserProfile(
    String id,
    String username,
    String fullName,
    String role,
    String branch,
    String realm,
    List<String> rights,
    long financialTxnLimitBdt,
    long hoFundingLimitBdt) {

  static UserProfile fromEntity(DirectoryUserEntity u) {
    List<String> rights =
        u.rights == null || u.rights.isBlank()
            ? List.of()
            : Arrays.stream(u.rights.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    return new UserProfile(
        u.id,
        u.username,
        u.fullName,
        u.role,
        u.branch,
        u.realm,
        rights,
        u.financialTxnLimitBdt,
        u.hoFundingLimitBdt);
  }
}
