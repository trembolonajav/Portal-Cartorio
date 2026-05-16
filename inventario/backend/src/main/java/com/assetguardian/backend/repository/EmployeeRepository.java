package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.EmployeeStatus;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    long countByStatus(EmployeeStatus status);
}
