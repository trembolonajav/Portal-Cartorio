package br.com.cartrio.hub.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
public class UserAccount {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private String username;

  @Column(nullable = false)
  private String nomeCompleto;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @OneToOne
  @JoinColumn(name = "employee_id", unique = true)
  private Employee employee;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "role", nullable = false)
  private Set<AppRole> roles = new LinkedHashSet<>();

  public UserAccount() {
  }

  public UserAccount(UUID id, String username, String nomeCompleto, String email, String password, Set<AppRole> roles) {
    this.id = id;
    this.username = username;
    this.nomeCompleto = nomeCompleto;
    this.email = email;
    this.password = password;
    this.roles = roles;
  }

  public UUID getId() { return id; }
  public String getUsername() { return username; }
  public String getNomeCompleto() { return nomeCompleto; }
  public String getEmail() { return email; }
  public String getPassword() { return password; }
  public Employee getEmployee() { return employee; }
  public Set<AppRole> getRoles() { return roles; }

  public void setUsername(String username) { this.username = username; }
  public void setNomeCompleto(String nomeCompleto) { this.nomeCompleto = nomeCompleto; }
  public void setEmail(String email) { this.email = email; }
  public void setPassword(String password) { this.password = password; }
  public void setEmployee(Employee employee) { this.employee = employee; }
  public void setRoles(Set<AppRole> roles) { this.roles = roles; }
}
