package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.Department;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
}
