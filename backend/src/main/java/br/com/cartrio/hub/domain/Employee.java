package br.com.cartrio.hub.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "employees")
public class Employee {
  @Id
  private UUID id;

  @Column(nullable = false, length = 160)
  private String fullName;

  @Column(unique = true, length = 14)
  private String cpf;

  @Column(unique = true, length = 180)
  private String email;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private EmployeeStatus status;

  @ManyToOne
  @JoinColumn(name = "department_id")
  private Department department;

  public Employee() {
  }

  public Employee(UUID id, String fullName, String cpf, String email, EmployeeStatus status, Department department) {
    this.id = id;
    this.fullName = fullName;
    this.cpf = cpf;
    this.email = email;
    this.status = status;
    this.department = department;
  }

  public UUID getId() { return id; }
  public String getFullName() { return fullName; }
  public String getCpf() { return cpf; }
  public String getEmail() { return email; }
  public EmployeeStatus getStatus() { return status; }
  public Department getDepartment() { return department; }

  public void setFullName(String fullName) { this.fullName = fullName; }
  public void setCpf(String cpf) { this.cpf = cpf; }
  public void setEmail(String email) { this.email = email; }
  public void setStatus(EmployeeStatus status) { this.status = status; }
  public void setDepartment(Department department) { this.department = department; }
}
