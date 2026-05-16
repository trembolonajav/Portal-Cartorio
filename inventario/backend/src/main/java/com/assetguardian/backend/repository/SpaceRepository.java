package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.Space;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpaceRepository extends JpaRepository<Space, Long> {

    List<Space> findAllByOrderBySortOrderAscNameAsc();
}
