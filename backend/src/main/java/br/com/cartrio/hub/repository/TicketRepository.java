package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.Ticket;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
  Optional<Ticket> findByNumero(int numero);
  List<Ticket> findAllByOrderByCreatedAtDesc();

  @Query("select coalesce(max(t.numero), 1000) from Ticket t")
  int findMaxNumero();
}
