package com.frms.ops.api.dto;

import java.util.List;

public record PageDto<T>(List<T> items, long total, int page, int pageSize) {

  public static <T> PageDto<T> of(List<T> items) {
    int n = items.size();
    return new PageDto<>(items, n, 1, Math.max(n, 1));
  }
}
