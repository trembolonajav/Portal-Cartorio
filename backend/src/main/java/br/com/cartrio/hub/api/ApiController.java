package br.com.cartrio.hub.api;

import br.com.cartrio.hub.api.Dto.CategoriaDto;
import br.com.cartrio.hub.api.Dto.CommentCreate;
import br.com.cartrio.hub.api.Dto.DashboardStats;
import br.com.cartrio.hub.api.Dto.DepartmentDto;
import br.com.cartrio.hub.api.Dto.DepartmentRequest;
import br.com.cartrio.hub.api.Dto.EmployeeDto;
import br.com.cartrio.hub.api.Dto.EmployeeRequest;
import br.com.cartrio.hub.api.Dto.LoginRequest;
import br.com.cartrio.hub.api.Dto.LoginResponse;
import br.com.cartrio.hub.api.Dto.SetorDto;
import br.com.cartrio.hub.api.Dto.TicketCommentDto;
import br.com.cartrio.hub.api.Dto.TicketCreate;
import br.com.cartrio.hub.api.Dto.TicketDto;
import br.com.cartrio.hub.api.Dto.TicketPatch;
import br.com.cartrio.hub.api.Dto.TicketResolve;
import br.com.cartrio.hub.domain.Categoria;
import br.com.cartrio.hub.domain.Department;
import br.com.cartrio.hub.domain.Employee;
import br.com.cartrio.hub.domain.EmployeeStatus;
import br.com.cartrio.hub.domain.AppRole;
import br.com.cartrio.hub.domain.Setor;
import br.com.cartrio.hub.domain.Ticket;
import br.com.cartrio.hub.domain.TicketComment;
import br.com.cartrio.hub.domain.TicketPriority;
import br.com.cartrio.hub.domain.TicketStatus;
import br.com.cartrio.hub.domain.UserAccount;
import br.com.cartrio.hub.repository.CategoriaRepository;
import br.com.cartrio.hub.repository.DepartmentRepository;
import br.com.cartrio.hub.repository.EmployeeRepository;
import br.com.cartrio.hub.repository.SetorRepository;
import br.com.cartrio.hub.repository.TicketCommentRepository;
import br.com.cartrio.hub.repository.TicketRepository;
import br.com.cartrio.hub.repository.UserAccountRepository;
import java.time.OffsetDateTime;
import java.text.Normalizer;
import java.util.Locale;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {
  private final UserAccountRepository users;
  private final TicketRepository tickets;
  private final TicketCommentRepository comments;
  private final SetorRepository setores;
  private final DepartmentRepository departments;
  private final EmployeeRepository employees;
  private final CategoriaRepository categorias;

  public ApiController(UserAccountRepository users, TicketRepository tickets, TicketCommentRepository comments, SetorRepository setores, DepartmentRepository departments, EmployeeRepository employees, CategoriaRepository categorias) {
    this.users = users;
    this.tickets = tickets;
    this.comments = comments;
    this.setores = setores;
    this.departments = departments;
    this.employees = employees;
    this.categorias = categorias;
  }

  @PostMapping("/auth/login")
  public LoginResponse login(@RequestBody LoginRequest request) {
    String login = request.username().trim().toLowerCase();
    UserAccount user = (login.contains("@") ? users.findByEmailIgnoreCase(login) : users.findByUsername(login))
      .filter(candidate -> candidate.getPassword().equals(request.password()))
      .filter(candidate -> candidate.getEmployee() == null || candidate.getEmployee().getStatus() == EmployeeStatus.ACTIVE)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário ou senha inválidos"));
    return new LoginResponse(Dto.user(user));
  }

  @GetMapping("/tickets")
  public List<TicketDto> tickets() {
    return tickets.findAllByOrderByCreatedAtDesc().stream().map(Dto::ticket).toList();
  }

  @PostMapping("/tickets")
  @ResponseStatus(HttpStatus.CREATED)
  public TicketDto createTicket(@RequestBody TicketCreate request) {
    UserAccount criadoPor = users.findById(request.criadoPorId())
      .orElseGet(() -> users.findByUsername("admin").orElseThrow());
    Categoria categoria = request.categoriaId() == null ? null : categorias.findById(request.categoriaId()).orElse(null);
    Setor setor = request.setorId() == null ? null : setores.findById(request.setorId()).orElse(null);
    OffsetDateTime now = OffsetDateTime.now();
    Ticket ticket = new Ticket(
      UUID.randomUUID(),
      tickets.findMaxNumero() + 1,
      request.titulo(),
      request.descricao(),
      TicketStatus.aberto,
      request.prioridade() == null ? TicketPriority.media : request.prioridade(),
      criadoPor,
      null,
      categoria,
      setor,
      request.anexos(),
      request.equipamentoRelacionado(),
      now.plusDays(2),
      now,
      now,
      null
    );
    Ticket saved = tickets.save(ticket);
    comments.save(new TicketComment(UUID.randomUUID(), saved, criadoPor, criadoPor.getNomeCompleto() + " abriu o chamado", false, now));
    return Dto.ticket(saved);
  }

  @GetMapping("/tickets/{numero}")
  public TicketDto ticket(@PathVariable int numero) {
    return Dto.ticket(findTicket(numero));
  }

  @PatchMapping("/tickets/{numero}")
  public TicketDto updateTicket(@PathVariable int numero, @RequestBody TicketPatch patch) {
    Ticket ticket = findTicket(numero);
    UserAccount autor = patch.autorId() == null ? null : users.findById(patch.autorId()).orElse(null);
    if (ticket.getStatus() == TicketStatus.resolvido && !isAdmin(autor)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chamado resolvido so pode ser alterado por administrador");
    }
    if (patch.status() != null) {
      if (patch.status() == TicketStatus.resolvido) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a acao Resolver chamado e informe a solucao aplicada");
      }
      ticket.setStatus(patch.status());
    }
    if (patch.prioridade() != null) ticket.setPrioridade(patch.prioridade());
    if (patch.atribuidoAId() != null) {
      UserAccount responsavel = users.findById(patch.atribuidoAId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Responsável não encontrado"));
      ticket.setAtribuidoA(responsavel);
      comments.save(new TicketComment(UUID.randomUUID(), ticket, responsavel, responsavel.getNomeCompleto() + " assumiu o chamado", true, OffsetDateTime.now()));
    }
    return Dto.ticket(tickets.save(ticket));
  }

  @PostMapping("/tickets/{numero}/resolve")
  public TicketDto resolveTicket(@PathVariable int numero, @RequestBody TicketResolve request) {
    Ticket ticket = findTicket(numero);
    if (ticket.getStatus() == TicketStatus.resolvido) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chamado ja esta resolvido");
    }
    UserAccount autor = request.autorId() == null
      ? users.findByUsername("admin").orElseThrow()
      : users.findById(request.autorId()).orElseThrow();
    if (isBlank(request.causa()) || isBlank(request.acaoRealizada())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Causa identificada e acao realizada sao obrigatorias");
    }
    if (ticket.getAtribuidoA() == null) {
      ticket.setAtribuidoA(autor);
    }
    ticket.setStatus(TicketStatus.resolvido);
    Ticket saved = tickets.save(ticket);
    String publicMessage = """
      Solucao do chamado

      Causa identificada: %s

      Acao realizada: %s
      """.formatted(request.causa().trim(), request.acaoRealizada().trim());
    comments.save(new TicketComment(UUID.randomUUID(), saved, autor, publicMessage.trim(), false, OffsetDateTime.now()));
    comments.save(new TicketComment(UUID.randomUUID(), saved, autor, autor.getNomeCompleto() + " resolveu formalmente o chamado", true, OffsetDateTime.now()));
    return Dto.ticket(saved);
  }

  @GetMapping("/tickets/{numero}/comments")
  public List<TicketCommentDto> comments(@PathVariable int numero) {
    return comments.findByTicketNumeroOrderByCreatedAtAsc(numero).stream().map(Dto::comment).toList();
  }

  @PostMapping("/tickets/{numero}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public TicketCommentDto createComment(@PathVariable int numero, @RequestBody CommentCreate request) {
    Ticket ticket = findTicket(numero);
    UserAccount autor = request.autorId() == null
      ? users.findByUsername("admin").orElseThrow()
      : users.findById(request.autorId()).orElseThrow();
    if (ticket.getStatus() == TicketStatus.resolvido && !isAdmin(autor)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chamado resolvido nao aceita novas interacoes");
    }
    TicketComment comment = new TicketComment(UUID.randomUUID(), ticket, autor, request.mensagem(), request.interno(), OffsetDateTime.now());
    return Dto.comment(comments.save(comment));
  }

  @GetMapping("/setores")
  public List<SetorDto> setores() {
    return setores.findAll().stream().map(Dto::setor).toList();
  }

  @GetMapping("/departments")
  public List<DepartmentDto> departments() {
    return departments.findAll().stream().map(Dto::department).toList();
  }

  @PostMapping("/departments")
  @ResponseStatus(HttpStatus.CREATED)
  public DepartmentDto createDepartment(@RequestBody DepartmentRequest request) {
    String name = requireText(request.name(), "Nome do departamento Ã© obrigatÃ³rio");
    departments.findByNameIgnoreCase(name).ifPresent(existing -> {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Departamento jÃ¡ cadastrado");
    });
    Department saved = departments.save(new Department(UUID.randomUUID(), name, request.active() == null || request.active()));
    return Dto.department(saved);
  }

  @PatchMapping("/departments/{id}")
  public DepartmentDto updateDepartment(@PathVariable UUID id, @RequestBody DepartmentRequest request) {
    Department department = departments.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Departamento nÃ£o encontrado"));
    if (request.name() != null) department.setName(requireText(request.name(), "Nome do departamento Ã© obrigatÃ³rio"));
    if (request.name() != null) {
      departments.findByNameIgnoreCase(department.getName())
        .filter(existing -> !existing.getId().equals(id))
        .ifPresent(existing -> {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "Departamento ja cadastrado");
        });
    }
    if (request.active() != null) department.setActive(request.active());
    return Dto.department(departments.save(department));
  }

  @GetMapping("/employees")
  public List<EmployeeDto> employees() {
    return employees.findAll().stream()
      .map(employee -> Dto.employee(employee, users.findByEmployeeId(employee.getId()).orElse(null)))
      .toList();
  }

  @PostMapping("/employees")
  @ResponseStatus(HttpStatus.CREATED)
  public EmployeeDto createEmployee(@RequestBody EmployeeRequest request) {
    assertEmployeeIdentityAvailable(null, requireText(request.fullName(), "Nome do funcionario e obrigatorio"), request.cpf(), request.email());
    assertRequestedUsernameAvailable(request.username(), null);
    Department department = request.departmentId() == null ? null : findDepartment(request.departmentId());
    Employee employee = new Employee(
      UUID.randomUUID(),
      requireText(request.fullName(), "Nome do funcionÃ¡rio Ã© obrigatÃ³rio"),
      blankToNull(request.cpf()),
      blankToNull(request.email()),
      request.status() == null ? EmployeeStatus.ACTIVE : request.status(),
      department
    );
    Employee saved = employees.save(employee);
    syncEmployeeAccount(saved, request.role() == null ? AppRole.usuario : request.role(), request.username(), request.password(), true);
    return Dto.employee(saved, users.findByEmployeeId(saved.getId()).orElse(null));
  }

  @PatchMapping("/employees/{id}")
  public EmployeeDto updateEmployee(@PathVariable UUID id, @RequestBody EmployeeRequest request) {
    Employee employee = employees.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FuncionÃ¡rio nÃ£o encontrado"));
    if (request.fullName() != null) employee.setFullName(requireText(request.fullName(), "Nome do funcionÃ¡rio Ã© obrigatÃ³rio"));
    assertRequestedUsernameAvailable(request.username(), users.findByEmployeeId(id).map(UserAccount::getId).orElse(null));
    assertEmployeeIdentityAvailable(id, employee.getFullName(), request.cpf() == null ? employee.getCpf() : request.cpf(), request.email() == null ? employee.getEmail() : request.email());
    if (request.cpf() != null) employee.setCpf(blankToNull(request.cpf()));
    if (request.email() != null) employee.setEmail(blankToNull(request.email()));
    if (request.status() != null) employee.setStatus(request.status());
    if (request.departmentId() != null) employee.setDepartment(findDepartment(request.departmentId()));
    Employee saved = employees.save(employee);
    syncEmployeeAccount(saved, request.role() == null ? null : request.role(), request.username(), request.password(), false);
    return Dto.employee(saved, users.findByEmployeeId(saved.getId()).orElse(null));
  }

  @GetMapping("/categorias")
  public List<CategoriaDto> categorias() {
    return categorias.findAll().stream().map(Dto::categoria).toList();
  }

  @GetMapping("/dashboard")
  public DashboardStats dashboard() {
    List<Ticket> all = tickets.findAll();
    OffsetDateTime now = OffsetDateTime.now();
    return new DashboardStats(
      countStatus(all, TicketStatus.aberto),
      countStatus(all, TicketStatus.em_andamento),
      countStatus(all, TicketStatus.aguardando_solicitante),
      (int) all.stream().filter(t -> t.getPrazo() != null && t.getStatus() != TicketStatus.resolvido && t.getPrazo().isBefore(now)).count(),
      (int) all.stream().filter(t -> t.getResolvidoEm() != null && t.getResolvidoEm().getMonth() == now.getMonth() && t.getResolvidoEm().getYear() == now.getYear()).count(),
      (int) all.stream().filter(t -> t.getAtribuidoA() == null && t.getStatus() != TicketStatus.resolvido).count()
    );
  }

  private Ticket findTicket(int numero) {
    return tickets.findByNumero(numero)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chamado não encontrado"));
  }

  private int countStatus(List<Ticket> tickets, TicketStatus status) {
    return (int) tickets.stream().filter(ticket -> ticket.getStatus() == status).count();
  }

  private Department findDepartment(UUID id) {
    return departments.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Departamento nÃ£o encontrado"));
  }

  private void assertEmployeeIdentityAvailable(UUID employeeId, String fullName, String cpf, String email) {
    employees.findByFullNameIgnoreCase(fullName)
      .filter(existing -> !existing.getId().equals(employeeId))
      .ifPresent(existing -> {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Funcionario ja cadastrado com este nome");
      });
    String normalizedCpf = blankToNull(cpf);
    if (normalizedCpf != null) {
      employees.findByCpf(normalizedCpf)
        .filter(existing -> !existing.getId().equals(employeeId))
        .ifPresent(existing -> {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ja cadastrado para outro funcionario");
        });
    }
    String normalizedEmail = blankToNull(email);
    if (normalizedEmail != null) {
      employees.findByEmailIgnoreCase(normalizedEmail)
        .filter(existing -> !existing.getId().equals(employeeId))
        .ifPresent(existing -> {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail ja cadastrado para outro funcionario");
        });
    }
  }

  private void syncEmployeeAccount(Employee employee, AppRole requestedRole, String requestedUsername, String requestedPassword, boolean isNewEmployee) {
    java.util.Optional<UserAccount> existing = users.findByEmployeeId(employee.getId())
      .or(() -> employee.getEmail() == null ? java.util.Optional.empty() : users.findByEmailIgnoreCase(employee.getEmail()));
    if (employee.getStatus() != EmployeeStatus.ACTIVE && existing.isEmpty()) return;

    String password = blankToNull(requestedPassword);
    String username = normalizeUsername(requestedUsername);
    UserAccount account = existing
      .orElseGet(() -> {
        String newUsername = username == null ? uniqueUsername(usernameBase(employee)) : username;
        assertUsernameAvailable(newUsername, null);
        String email = employee.getEmail() == null ? newUsername + "@cartorio.local" : employee.getEmail();
        return new UserAccount(UUID.randomUUID(), newUsername, employee.getFullName(), email, password == null ? "123456" : password, Set.of(AppRole.usuario));
      });
    if (username != null && !username.equals(account.getUsername())) {
      assertUsernameAvailable(username, account.getId());
      account.setUsername(username);
    }
    account.setNomeCompleto(employee.getFullName());
    account.setEmail(employee.getEmail() == null ? account.getUsername() + "@cartorio.local" : employee.getEmail());
    if (password != null) account.setPassword(password);
    if (isNewEmployee && password == null) account.setPassword("123456");
    account.setEmployee(employee);
    if (requestedRole != null) account.setRoles(Set.of(requestedRole));
    users.save(account);
  }

  private void assertUsernameAvailable(String username, UUID accountId) {
    users.findByUsername(username)
      .filter(existing -> !existing.getId().equals(accountId))
      .ifPresent(existing -> {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Login ja utilizado por outro usuario");
      });
  }

  private void assertRequestedUsernameAvailable(String requestedUsername, UUID accountId) {
    String username = normalizeUsername(requestedUsername);
    if (username != null) {
      assertUsernameAvailable(username, accountId);
    }
  }

  private String normalizeUsername(String value) {
    String username = blankToNull(value);
    if (username == null) return null;
    String normalized = Normalizer.normalize(username, Normalizer.Form.NFD)
      .replaceAll("\\p{M}", "")
      .toLowerCase(Locale.ROOT)
      .replaceAll("[^a-z0-9._-]+", "-")
      .replaceAll("(^[-._]+|[-._]+$)", "");
    if (normalized.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um login valido");
    }
    return normalized;
  }

  private String uniqueUsername(String base) {
    String candidate = base;
    int suffix = 2;
    while (users.findByUsername(candidate).isPresent()) {
      candidate = base + "-" + suffix;
      suffix++;
    }
    return candidate;
  }

  private String usernameBase(Employee employee) {
    String source = employee.getEmail() == null ? employee.getFullName() : employee.getEmail().split("@")[0];
    String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
      .replaceAll("\\p{M}", "")
      .toLowerCase(Locale.ROOT)
      .replaceAll("[^a-z0-9]+", "-")
      .replaceAll("(^-|-$)", "");
    return normalized.isBlank() ? "funcionario" : normalized;
  }

  private String requireText(String value, String message) {
    String normalized = blankToNull(value);
    if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    return normalized;
  }

  private boolean isAdmin(UserAccount user) {
    return user != null && user.getRoles().contains(AppRole.admin);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String blankToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
