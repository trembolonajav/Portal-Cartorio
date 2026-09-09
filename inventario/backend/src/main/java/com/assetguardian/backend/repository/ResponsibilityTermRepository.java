package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.ResponsibilityTerm;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResponsibilityTermRepository extends JpaRepository<ResponsibilityTerm, Long> {

    long countByNumberStartingWith(String prefix);

    List<ResponsibilityTerm> findAllByOrderByCreatedAtDesc();
}
