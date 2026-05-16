package br.com.cartrio.hub.repository;

import br.com.cartrio.hub.domain.TicketComment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCommentRepository extends JpaRepository<TicketComment, UUID> {
  List<TicketComment> findByTicketNumeroOrderByCreatedAtAsc(int numero);
}
