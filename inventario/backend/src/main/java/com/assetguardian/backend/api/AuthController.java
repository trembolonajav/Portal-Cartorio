package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AuthMeResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/me")
    public AuthMeResponse me(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(authority -> authority.startsWith("ROLE_"))
            .map(authority -> authority.substring(5))
            .sorted()
            .toList();

        String primaryRole = roles.isEmpty() ? "USER" : roles.getFirst();

        return new AuthMeResponse(
            authentication.getName(),
            primaryRole,
            roles,
            "ADMIN".equals(primaryRole) ? "Administrador" : "OPERATOR".equals(primaryRole) ? "Operadora" : "Funcionario"
        );
    }
}
