package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.Employee;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
  Optional<Employee> findByEmailIgnoreCase(String email);
  Optional<Employee> findByCpf(String cpf);
}
