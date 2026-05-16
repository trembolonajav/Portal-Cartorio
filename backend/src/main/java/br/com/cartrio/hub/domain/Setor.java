package br.com.cartrio.hub.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.util.UUID;

@Entity
public class Setor {
  @Id
  private UUID id;

  @Column(nullable = false)
  private String nome;

  @Column(nullable = false)
  private boolean ativo;

  public Setor() {
  }

  public Setor(UUID id, String nome, boolean ativo) {
    this.id = id;
    this.nome = nome;
    this.ativo = ativo;
  }

  public UUID getId() { return id; }
  public String getNome() { return nome; }
  public boolean isAtivo() { return ativo; }
}
