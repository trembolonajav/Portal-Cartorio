package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.Categoria;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaRepository extends JpaRepository<Categoria, UUID> {
}
