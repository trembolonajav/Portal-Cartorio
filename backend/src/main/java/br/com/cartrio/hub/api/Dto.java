package br.com.cartrio.hub.api;

import br.com.cartrio.hub.domain.AppRole;
import br.com.cartrio.hub.domain.Categoria;
import br.com.cartrio.hub.domain.Department;
import br.com.cartrio.hub.domain.Employee;
import br.com.cartrio.hub.domain.EmployeeStatus;
import br.com.cartrio.hub.domain.Setor;
import br.com.cartrio.hub.domain.Ticket;
import br.com.cartrio.hub.domain.TicketComment;
import br.com.cartrio.hub.domain.TicketPriority;
import br.com.cartrio.hub.domain.TicketStatus;
import br.com.cartrio.hub.domain.UserAccount;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

public class Dto {
  public record LoginRequest(String username, String password) {}
  public record LoginResponse(UserDto user) {}
  public record UserDto(UUID id, String username, String nomeCompleto, String email, Set<AppRole> roles, EmployeeDto employee) {}
  public record DepartmentDto(UUID id, String name, boolean active) {}
  public record EmployeeDto(UUID id, String fullName, String cpf, String email, EmployeeStatus status, DepartmentDto department, String username, AppRole role) {}
  public record DepartmentRequest(String name, Boolean active) {}
  public record EmployeeRequest(String fullName, String cpf, String email, EmployeeStatus status, UUID departmentId, AppRole role, String username, String password) {}
  public record SetorDto(UUID id, String nome, boolean ativo) {}
  public record CategoriaDto(UUID id, String nome, boolean ativo) {}
  public record TicketCreate(String titulo, String descricao, TicketPriority prioridade, UUID categoriaId, UUID setorId, UUID criadoPorId, String anexos, String equipamentoRelacionado) {}
  public record TicketPatch(TicketStatus status, TicketPriority prioridade, UUID atribuidoAId, UUID autorId) {}
  public record TicketResolve(UUID autorId, String causa, String acaoRealizada) {}
  public record CommentCreate(String mensagem, boolean interno, UUID autorId) {}
  public record DashboardStats(int aberto, int emAndamento, int aguardando, int atrasados, int resolvidosMes, int semResponsavel) {}

  public record TicketDto(
    UUID id,
    int numero,
    String titulo,
    String descricao,
    TicketStatus status,
    TicketPriority prioridade,
    UserDto criadoPor,
    UserDto atribuidoA,
    CategoriaDto categoria,
    SetorDto setor,
    String anexos,
    String equipamentoRelacionado,
    OffsetDateTime prazo,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime resolvidoEm
  ) {}

  public record TicketCommentDto(UUID id, UserDto autor, String mensagem, boolean interno, OffsetDateTime createdAt) {}

  public static UserDto user(UserAccount user) {
    if (user == null) return null;
    return new UserDto(user.getId(), user.getUsername(), user.getNomeCompleto(), user.getEmail(), user.getRoles(), employee(user.getEmployee()));
  }

  public static DepartmentDto department(Department department) {
    if (department == null) return null;
    return new DepartmentDto(department.getId(), department.getName(), department.isActive());
  }

  public static EmployeeDto employee(Employee employee) {
    return employee(employee, null);
  }

  public static EmployeeDto employee(Employee employee, UserAccount account) {
    if (employee == null) return null;
    AppRole role = account == null || account.getRoles().isEmpty() ? AppRole.usuario : account.getRoles().iterator().next();
    return new EmployeeDto(employee.getId(), employee.getFullName(), employee.getCpf(), employee.getEmail(), employee.getStatus(), department(employee.getDepartment()), account == null ? null : account.getUsername(), role);
  }

  public static SetorDto setor(Setor setor) {
    if (setor == null) return null;
    return new SetorDto(setor.getId(), setor.getNome(), setor.isAtivo());
  }

  public static CategoriaDto categoria(Categoria categoria) {
    if (categoria == null) return null;
    return new CategoriaDto(categoria.getId(), categoria.getNome(), categoria.isAtivo());
  }

  public static TicketDto ticket(Ticket ticket) {
    return new TicketDto(
      ticket.getId(),
      ticket.getNumero(),
      ticket.getTitulo(),
      ticket.getDescricao(),
      ticket.getStatus(),
      ticket.getPrioridade(),
      user(ticket.getCriadoPor()),
      user(ticket.getAtribuidoA()),
      categoria(ticket.getCategoria()),
      setor(ticket.getSetor()),
      ticket.getAnexos(),
      ticket.getEquipamentoRelacionado(),
      ticket.getPrazo(),
      ticket.getCreatedAt(),
      ticket.getUpdatedAt(),
      ticket.getResolvidoEm()
    );
  }

  public static TicketCommentDto comment(TicketComment comment) {
    return new TicketCommentDto(
      comment.getId(),
      user(comment.getAutor()),
      comment.getMensagem(),
      comment.isInterno(),
      comment.getCreatedAt()
    );
  }
}
