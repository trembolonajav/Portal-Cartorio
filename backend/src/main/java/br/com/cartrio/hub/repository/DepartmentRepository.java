package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.Department;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
  Optional<Department> findByNameIgnoreCase(String name);
}
