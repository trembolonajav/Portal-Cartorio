package br.com.cartrio.hub.config;

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
import br.com.cartrio.hub.repository.CategoriaRepository;
import br.com.cartrio.hub.repository.DepartmentRepository;
import br.com.cartrio.hub.repository.EmployeeRepository;
import br.com.cartrio.hub.repository.SetorRepository;
import br.com.cartrio.hub.repository.TicketCommentRepository;
import br.com.cartrio.hub.repository.TicketRepository;
import br.com.cartrio.hub.repository.UserAccountRepository;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
  private final UserAccountRepository users;
  private final SetorRepository setores;
  private final DepartmentRepository departments;
  private final EmployeeRepository employees;
  private final CategoriaRepository categorias;
  private final TicketRepository tickets;
  private final TicketCommentRepository comments;

  public DataSeeder(UserAccountRepository users, SetorRepository setores, DepartmentRepository departments, EmployeeRepository employees, CategoriaRepository categorias, TicketRepository tickets, TicketCommentRepository comments) {
    this.users = users;
    this.setores = setores;
    this.departments = departments;
    this.employees = employees;
    this.categorias = categorias;
    this.tickets = tickets;
    this.comments = comments;
  }

  @Override
  public void run(String... args) {
    UserAccount admin = user(1, "admin", "Administrador", "admin@cartorio.local", Set.of(AppRole.admin));
    UserAccount marina = user(2, "marina-c", "Marina Costa", "marina@cartorio.local", Set.of(AppRole.operador));
    UserAccount pedro = user(3, "pedro-a", "Pedro Almeida", "pedro@cartorio.local", Set.of(AppRole.usuario));
    UserAccount juliana = user(4, "juliana-s", "Juliana Santos", "juliana@cartorio.local", Set.of(AppRole.operador));
    UserAccount rafael = user(5, "rafael-m", "Rafael Martins", "rafael@cartorio.local", Set.of(AppRole.usuario));
    UserAccount bianca = user(6, "bianca-l", "Bianca Lima", "bianca@cartorio.local", Set.of(AppRole.usuario));

    Setor notas = setor(11, "Notas");
    Setor ti = setor(12, "Tecnologia");
    Setor financeiro = setor(13, "Financeiro");
    Setor atendimento = setor(14, "Atendimento");
    Setor arquivo = setor(15, "Arquivo");
    Setor escritura = setor(16, "Escrituras");

    Department notasDept = department(11, "Notas");
    Department tiDept = department(12, "Tecnologia");
    Department financeiroDept = department(13, "Financeiro");
    Department atendimentoDept = department(14, "Atendimento");
    Department arquivoDept = department(15, "Arquivo");
    Department escrituraDept = department(16, "Escrituras");

    linkEmployee(admin, employee(1, "Administrador", "admin@cartorio.local", tiDept));
    linkEmployee(marina, employee(2, "Marina Costa", "marina@cartorio.local", tiDept));
    linkEmployee(pedro, employee(3, "Pedro Almeida", "pedro@cartorio.local", notasDept));
    linkEmployee(juliana, employee(4, "Juliana Santos", "juliana@cartorio.local", atendimentoDept));
    linkEmployee(rafael, employee(5, "Rafael Martins", "rafael@cartorio.local", financeiroDept));
    linkEmployee(bianca, employee(6, "Bianca Lima", "bianca@cartorio.local", arquivoDept));

    Categoria sistema = categoria(21, "Sistema");
    Categoria equipamento = categoria(22, "Equipamento");
    Categoria acesso = categoria(23, "Acesso");
    Categoria operacional = categoria(24, "Operacional");
    Categoria documentos = categoria(25, "Documentos");
    Categoria infraestrutura = categoria(26, "Infraestrutura");

    Ticket t1 = ticket(31, 1007, "Certificado digital expirando no balcão 2", "O certificado usado para autenticação no sistema de notas vence esta semana. Precisamos renovar antes do atendimento de sexta-feira.", TicketStatus.em_andamento, TicketPriority.alta, pedro, marina, acesso, notas, days(1), days(-2), days(-1), null);
    Ticket t2 = ticket(32, 1006, "Impressora da recepção falhando em autenticações", "A impressora térmica alterna entre online e offline. Já reiniciamos o equipamento e o computador local.", TicketStatus.aberto, TicketPriority.media, pedro, null, equipamento, atendimento, days(-1), days(-3), days(-3), null);
    Ticket t3 = ticket(33, 1005, "Revisar perfil de acesso de escrevente substituto", "Novo colaborador precisa acessar chamados do setor de notas e visualizar histórico operacional.", TicketStatus.aguardando_solicitante, TicketPriority.baixa, admin, marina, acesso, ti, days(3), days(-4), days(-1), null);
    Ticket t4 = ticket(34, 1004, "Conferência de planilha de custas", "A planilha importada está com divergência nos totais de reconhecimento de firma.", TicketStatus.resolvido, TicketPriority.alta, marina, admin, operacional, financeiro, days(-2), days(-8), days(-2), days(-2));
    Ticket t5 = ticket(35, 1003, "Erro intermitente ao anexar documentos", "Arquivos PDF acima de 8 MB falham em alguns computadores. Precisamos validar limite e mensagem exibida ao usuário.", TicketStatus.em_analise, TicketPriority.media, pedro, admin, sistema, ti, days(2), days(-5), days(-1), null);
    Ticket t6 = ticket(36, 1008, "Fila de atendimento sem atualização no painel", "O painel da recepção parou de atualizar a senha atual. A chamada manual continua funcionando.", TicketStatus.aberto, TicketPriority.alta, bianca, juliana, sistema, atendimento, hours(8), days(-1), hours(-6), null);
    Ticket t7 = ticket(37, 1009, "Solicitar ponto de rede para sala de escrituras", "A nova estação da sala de escrituras precisa de ponto de rede cabeado para operar com estabilidade.", TicketStatus.em_analise, TicketPriority.media, rafael, null, infraestrutura, escritura, days(5), days(-1), days(-1), null);
    Ticket t8 = ticket(38, 1010, "Digitalização de livros antigos com baixa qualidade", "Scanner do arquivo está gerando imagens escuras em livros de grande formato. Precisamos revisar perfil de digitalização.", TicketStatus.em_andamento, TicketPriority.media, bianca, marina, documentos, arquivo, days(4), days(-6), days(-1), null);
    Ticket t9 = ticket(39, 1011, "Permissão para relatório mensal de selos", "Usuária precisa visualizar o relatório mensal de selos para fechamento financeiro.", TicketStatus.aguardando_solicitante, TicketPriority.baixa, rafael, admin, acesso, financeiro, days(2), days(-2), hours(-5), null);
    Ticket t10 = ticket(40, 1012, "Lentidão ao pesquisar atos antigos", "Consultas por período acima de 12 meses estão levando mais de 40 segundos.", TicketStatus.em_andamento, TicketPriority.alta, marina, juliana, sistema, notas, hours(20), days(-3), hours(-2), null);
    Ticket t11 = ticket(41, 1013, "Troca preventiva de nobreak do rack principal", "O nobreak emitiu alerta de bateria degradada. Solicitação preventiva antes de queda de energia.", TicketStatus.aberto, TicketPriority.alta, admin, null, infraestrutura, ti, days(-2), days(-4), days(-4), null);
    Ticket t12 = ticket(42, 1014, "Modelo de minuta precisa de atualização", "Campo de qualificação foi alterado na última orientação interna e precisa refletir no modelo padrão.", TicketStatus.resolvido, TicketPriority.baixa, bianca, marina, documentos, escritura, days(-1), days(-7), days(-1), days(-1));

    comment(41, t1, pedro, "Anexei o aviso de vencimento recebido no navegador.", false, days(-2));
    comment(42, t1, marina, "Vou validar a cadeia do certificado e preparar a renovação.", false, days(-1));
    comment(43, t1, admin, "Priorizar antes do início do expediente de sexta.", true, days(-1));
    comment(44, t3, marina, "Aguardando confirmação do perfil exato que o colaborador deve usar.", false, days(-1));
    comment(45, t2, pedro, "O problema ocorre principalmente no computador da recepção.", false, days(-1));
    comment(46, t4, admin, "Divergência conferida e base corrigida.", false, days(-2));
    comment(47, t6, bianca, "O painel está congelado desde 09:20, mas o sistema de senhas abre normalmente.", false, hours(-7));
    comment(48, t6, juliana, "Reiniciei o serviço do painel e vou acompanhar até o fim do expediente.", false, hours(-5));
    comment(49, t8, marina, "Ajustei brilho e contraste no perfil de teste. Falta validar com o livro do arquivo 3.", true, hours(-8));
    comment(50, t9, admin, "Preciso que o financeiro confirme se o acesso será apenas leitura.", false, hours(-5));
    comment(51, t10, juliana, "A lentidão parece concentrada em pesquisas com anexos. Vou abrir análise de índice no banco.", true, hours(-2));
    comment(52, t11, admin, "Solicitação marcada como alta por risco operacional no rack principal.", true, days(-3));
    syncEmployeeAccounts();
    mockRobsonTickets(sistema, equipamento, atendimento, notas);

    comment(53, t12, marina, "Modelo atualizado e publicado para a equipe de escrituras.", false, days(-1));
  }

  private UserAccount user(int id, String username, String nome, String email, Set<AppRole> roles) {
    return users.findById(id(id)).orElseGet(() -> users.save(new UserAccount(id(id), username, nome, email, "123456", roles)));
  }

  private Setor setor(int id, String nome) {
    return setores.findById(id(id)).orElseGet(() -> setores.save(new Setor(id(id), nome, true)));
  }

  private Department department(int id, String name) {
    return departments.findById(id(id)).orElseGet(() -> departments.save(new Department(id(id), name, true)));
  }

  private Employee employee(int id, String fullName, String email, Department department) {
    return employees.findById(id(id)).orElseGet(() -> employees.save(new Employee(id(id), fullName, null, email, EmployeeStatus.ACTIVE, department)));
  }

  private void linkEmployee(UserAccount user, Employee employee) {
    if (user.getEmployee() != null) return;
    user.setEmployee(employee);
    users.save(user);
  }

  private void syncEmployeeAccounts() {
    employees.findAll().forEach(employee -> {
      if (employee.getStatus() != EmployeeStatus.ACTIVE) return;
      Optional<UserAccount> existing = users.findByEmployeeId(employee.getId());
      if (existing.isPresent()) return;
      String username = uniqueUsername(usernameBase(employee));
      String email = employee.getEmail() == null ? username + "@cartorio.local" : employee.getEmail();
      UserAccount account = new UserAccount(UUID.randomUUID(), username, employee.getFullName(), email, "123456", Set.of(AppRole.usuario));
      account.setEmployee(employee);
      users.save(account);
    });
  }

  private void mockRobsonTickets(Categoria sistema, Categoria equipamento, Setor atendimento, Setor notas) {
    users.findByUsername("robson-ferreira-ramos").ifPresent(robson -> {
      Ticket r1 = ticket(101, 2001, "Computador da estação Rec-Robson travando", "O computador está travando ao abrir o sistema de reconhecimento de firma e precisa ser reiniciado algumas vezes durante o atendimento.", TicketStatus.aberto, TicketPriority.alta, robson, null, sistema, atendimento, hours(10), hours(-5), hours(-5), null);
      Ticket r2 = ticket(102, 2002, "Impressora não imprime etiqueta de autenticação", "As etiquetas saem em branco na primeira tentativa e só imprimem depois de reiniciar a impressora.", TicketStatus.em_andamento, TicketPriority.media, robson, users.findByUsername("marina-c").orElse(null), equipamento, atendimento, days(1), days(-2), hours(-3), null);
      Ticket r3 = ticket(103, 2003, "Solicitar acesso ao relatório de atendimentos", "Preciso visualizar o relatório de atendimentos do meu balcão para conferir os protocolos finalizados no dia.", TicketStatus.aguardando_solicitante, TicketPriority.baixa, robson, users.findByUsername("admin").orElse(null), sistema, notas, days(3), days(-4), days(-1), null);
      comment(101, r1, robson, "O travamento ocorreu novamente durante a manhã.", false, hours(-4));
      comment(102, r2, robson, "Enviei um exemplo da etiqueta que saiu em branco.", false, days(-1));
      comment(103, r3, robson, "O acesso pode ser somente leitura.", false, days(-3));
    });
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

  private Categoria categoria(int id, String nome) {
    return categorias.findById(id(id)).orElseGet(() -> categorias.save(new Categoria(id(id), nome, true)));
  }

  private Ticket ticket(int id, int numero, String titulo, String descricao, TicketStatus status, TicketPriority prioridade, UserAccount criadoPor, UserAccount atribuidoA, Categoria categoria, Setor setor, OffsetDateTime prazo, OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime resolvidoEm) {
    return tickets.findByNumero(numero).orElseGet(() -> tickets.save(new Ticket(id(id), numero, titulo, descricao, status, prioridade, criadoPor, atribuidoA, categoria, setor, prazo, createdAt, updatedAt, resolvidoEm)));
  }

  private void comment(int id, Ticket ticket, UserAccount autor, String mensagem, boolean interno, OffsetDateTime createdAt) {
    if (comments.existsById(id(id))) return;
    comments.save(new TicketComment(id(id), ticket, autor, mensagem, interno, createdAt));
  }

  private UUID id(int value) {
    return UUID.fromString(String.format("00000000-0000-4000-8000-%012d", value));
  }

  private OffsetDateTime days(int days) {
    return OffsetDateTime.now().plusDays(days).withHour(10).withMinute(0).withSecond(0).withNano(0);
  }

  private OffsetDateTime hours(int hours) {
    return OffsetDateTime.now().plusHours(hours).withSecond(0).withNano(0);
  }
}
