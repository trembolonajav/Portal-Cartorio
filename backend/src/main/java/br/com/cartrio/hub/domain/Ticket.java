package br.com.cartrio.hub.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
public class Ticket {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private int numero;

  @Column(nullable = false)
  private String titulo;

  @Column(nullable = false, length = 4000)
  private String descricao;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TicketStatus status;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TicketPriority prioridade;

  @ManyToOne(optional = false)
  private UserAccount criadoPor;

  @ManyToOne
  private UserAccount atribuidoA;

  @ManyToOne
  private Categoria categoria;

  @ManyToOne
  private Setor setor;

  private String anexos;
  private String equipamentoRelacionado;
  private OffsetDateTime prazo;
  private OffsetDateTime createdAt;
  private OffsetDateTime updatedAt;
  private OffsetDateTime resolvidoEm;

  public Ticket() {
  }

  public Ticket(UUID id, int numero, String titulo, String descricao, TicketStatus status, TicketPriority prioridade, UserAccount criadoPor, UserAccount atribuidoA, Categoria categoria, Setor setor, OffsetDateTime prazo, OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime resolvidoEm) {
    this(id, numero, titulo, descricao, status, prioridade, criadoPor, atribuidoA, categoria, setor, null, null, prazo, createdAt, updatedAt, resolvidoEm);
  }

  public Ticket(UUID id, int numero, String titulo, String descricao, TicketStatus status, TicketPriority prioridade, UserAccount criadoPor, UserAccount atribuidoA, Categoria categoria, Setor setor, String anexos, String equipamentoRelacionado, OffsetDateTime prazo, OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime resolvidoEm) {
    this.id = id;
    this.numero = numero;
    this.titulo = titulo;
    this.descricao = descricao;
    this.status = status;
    this.prioridade = prioridade;
    this.criadoPor = criadoPor;
    this.atribuidoA = atribuidoA;
    this.categoria = categoria;
    this.setor = setor;
    this.anexos = anexos;
    this.equipamentoRelacionado = equipamentoRelacionado;
    this.prazo = prazo;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.resolvidoEm = resolvidoEm;
  }

  public UUID getId() { return id; }
  public int getNumero() { return numero; }
  public String getTitulo() { return titulo; }
  public String getDescricao() { return descricao; }
  public TicketStatus getStatus() { return status; }
  public TicketPriority getPrioridade() { return prioridade; }
  public UserAccount getCriadoPor() { return criadoPor; }
  public UserAccount getAtribuidoA() { return atribuidoA; }
  public Categoria getCategoria() { return categoria; }
  public Setor getSetor() { return setor; }
  public String getAnexos() { return anexos; }
  public String getEquipamentoRelacionado() { return equipamentoRelacionado; }
  public OffsetDateTime getPrazo() { return prazo; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public OffsetDateTime getResolvidoEm() { return resolvidoEm; }

  public void setStatus(TicketStatus status) {
    this.status = status;
    this.updatedAt = OffsetDateTime.now();
    if (status == TicketStatus.resolvido && this.resolvidoEm == null) {
      this.resolvidoEm = OffsetDateTime.now();
    }
  }

  public void setPrioridade(TicketPriority prioridade) {
    this.prioridade = prioridade;
    this.updatedAt = OffsetDateTime.now();
  }

  public void setAtribuidoA(UserAccount atribuidoA) {
    this.atribuidoA = atribuidoA;
    this.updatedAt = OffsetDateTime.now();
    if (atribuidoA != null && this.status == TicketStatus.aberto) {
      this.status = TicketStatus.em_andamento;
    }
  }

}
