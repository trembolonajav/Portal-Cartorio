package com.assetguardian.backend.api.dto;

import java.util.List;

public record AuthMeResponse(
    String username,
    String role,
    List<String> roles,
    String displayRole
) {
}
