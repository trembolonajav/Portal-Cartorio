package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.Setor;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SetorRepository extends JpaRepository<Setor, UUID> {
}
