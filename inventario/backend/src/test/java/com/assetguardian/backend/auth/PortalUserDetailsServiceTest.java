package com.assetguardian.backend.auth;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PortalUserDetailsServiceTest {

    private final PortalUserAccountRepository repository = mock(PortalUserAccountRepository.class);
    private final PortalUserDetailsService service = new PortalUserDetailsService(repository);

    @Test
    void legacyInternRoleReceivesOnlyUserAuthority() {
        PortalUserAccount account = new PortalUserAccount();
        account.setId(UUID.randomUUID());
        account.setUsername("estagiario");
        account.setFullName("Estagiário");
        account.setEmail("estagiario@local");
        account.setPassword("senha");
        account.setRoles(new LinkedHashSet<>(Set.of("estagiario")));
        when(repository.findByUsernameIgnoreCase("estagiario")).thenReturn(Optional.of(account));

        var details = service.loadUserByUsername("estagiario");

        assertTrue(details.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        assertTrue(details.getAuthorities().stream().noneMatch(a ->
            a.getAuthority().equals("ROLE_OPERATOR") || a.getAuthority().equals("ROLE_ADMIN")));
    }
}
