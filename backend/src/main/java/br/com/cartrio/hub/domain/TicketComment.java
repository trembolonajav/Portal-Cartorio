package br.com.cartrio.hub.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
public class TicketComment {
  @Id
  private UUID id;

  @ManyToOne(optional = false)
  private Ticket ticket;

  @ManyToOne(optional = false)
  private UserAccount autor;

  @Column(nullable = false, length = 4000)
  private String mensagem;

  @Column(nullable = false)
  private boolean interno;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  public TicketComment() {
  }

  public TicketComment(UUID id, Ticket ticket, UserAccount autor, String mensagem, boolean interno, OffsetDateTime createdAt) {
    this.id = id;
    this.ticket = ticket;
    this.autor = autor;
    this.mensagem = mensagem;
    this.interno = interno;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public Ticket getTicket() { return ticket; }
  public UserAccount getAutor() { return autor; }
  public String getMensagem() { return mensagem; }
  public boolean isInterno() { return interno; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
}
