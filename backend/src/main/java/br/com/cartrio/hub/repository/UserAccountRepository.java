package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
  Optional<UserAccount> findByUsername(String username);
  Optional<UserAccount> findByEmailIgnoreCase(String email);
  Optional<UserAccount> findByEmployeeId(UUID employeeId);
}
