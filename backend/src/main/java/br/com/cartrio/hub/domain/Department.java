package br.com.cartrio.hub.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "departments")
public class Department {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true, length = 120)
  private String name;

  @Column(nullable = false)
  private boolean active;

  public Department() {
  }

  public Department(UUID id, String name, boolean active) {
    this.id = id;
    this.name = name;
    this.active = active;
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public boolean isActive() { return active; }

  public void setName(String name) { this.name = name; }
  public void setActive(boolean active) { this.active = active; }
}
