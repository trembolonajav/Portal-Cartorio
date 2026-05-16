package com.assetguardian.backend.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortalUserAccountRepository extends JpaRepository<PortalUserAccount, UUID> {
    Optional<PortalUserAccount> findByUsernameIgnoreCase(String username);
}
