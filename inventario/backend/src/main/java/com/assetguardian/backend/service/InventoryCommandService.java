package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetInventoryResponse;
import com.assetguardian.backend.api.dto.AssetRequest;
import com.assetguardian.backend.api.dto.ChangeResponsibleRequest;
import com.assetguardian.backend.api.dto.DepartmentRequest;
import com.assetguardian.backend.api.dto.DepartmentResponse;
import com.assetguardian.backend.api.dto.EmployeeRequest;
import com.assetguardian.backend.api.dto.EmployeeResponse;
import com.assetguardian.backend.api.dto.HistoryEventResponse;
import com.assetguardian.backend.api.dto.MovementResponse;
import com.assetguardian.backend.api.dto.SpaceRequest;
import com.assetguardian.backend.api.dto.SpaceResponse;
import com.assetguardian.backend.api.dto.StationRequest;
import com.assetguardian.backend.api.dto.StationResponse;
import com.assetguardian.backend.api.dto.TransferAssetRequest;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetOrigin;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Department;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Space;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.domain.StationStatus;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.AssetDisposalItemRepository;
import com.assetguardian.backend.repository.DepartmentRepository;
import com.assetguardian.backend.repository.EmployeeRepository;
import com.assetguardian.backend.repository.EquipmentExchangeTermRepository;
import com.assetguardian.backend.repository.PhysicalCheckRepository;
import com.assetguardian.backend.repository.ResponsibilityTermItemRepository;
import com.assetguardian.backend.repository.SpaceRepository;
import com.assetguardian.backend.repository.StationRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryCommandService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final SpaceRepository spaceRepository;
    private final StationRepository stationRepository;
    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final AssetMovementRepository assetMovementRepository;
    private final AssetDisposalItemRepository assetDisposalItemRepository;
    private final ResponsibilityTermItemRepository responsibilityTermItemRepository;
    private final EquipmentExchangeTermRepository equipmentExchangeTermRepository;
    private final PhysicalCheckRepository physicalCheckRepository;
    private final StationResponsibilityRepository stationResponsibilityRepository;
    private final AssetPolicyService assetPolicyService;

    public List<DepartmentResponse> listDepartments() {
        return departmentRepository.findAll().stream()
            .sorted(Comparator.comparing(Department::getName, String.CASE_INSENSITIVE_ORDER))
            .map(department -> new DepartmentResponse(department.getId(), department.getName()))
            .toList();
    }

    public DepartmentResponse createDepartment(DepartmentRequest request) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Departamentos devem ser gerenciados no Portal Indio Artiaga");
    }

    public DepartmentResponse updateDepartment(UUID id, DepartmentRequest request) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Departamentos devem ser gerenciados no Portal Indio Artiaga");
    }

    public void deleteDepartment(UUID id) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Departamentos devem ser gerenciados no Portal Indio Artiaga");
    }

    public List<SpaceResponse> listSpaces() {
        return spaceRepository.findAllByOrderBySortOrderAscNameAsc().stream()
            .map(this::toSpaceResponse)
            .toList();
    }

    public SpaceResponse createSpace(SpaceRequest request) {
        Space space = new Space();
        applySpace(space, request);
        return toSpaceResponse(spaceRepository.save(space));
    }

    public SpaceResponse updateSpace(Long id, SpaceRequest request) {
        Space space = requireSpace(id);
        applySpace(space, request);
        return toSpaceResponse(spaceRepository.save(space));
    }

    public void deleteSpace(Long id) {
        spaceRepository.delete(requireSpace(id));
    }

    public List<EmployeeResponse> listEmployees() {
        return employeeRepository.findAll().stream()
            .sorted(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toEmployeeResponse)
            .toList();
    }

    public EmployeeResponse createEmployee(EmployeeRequest request) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Funcionarios devem ser gerenciados no Portal Indio Artiaga");
    }

    public EmployeeResponse updateEmployee(UUID id, EmployeeRequest request) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Funcionarios devem ser gerenciados no Portal Indio Artiaga");
    }

    public void deleteEmployee(UUID id) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Funcionarios devem ser gerenciados no Portal Indio Artiaga");
    }

    public List<StationResponse> listStations() {
        return stationRepository.findAll().stream()
            .sorted(Comparator.comparing(Station::getCode, String.CASE_INSENSITIVE_ORDER))
            .map(this::toStationResponse)
            .toList();
    }

    public StationResponse createStation(StationRequest request) {
        Station station = new Station();
        applyStation(station, request);
        return toStationResponse(saveStation(station));
    }

    public StationResponse updateStation(Long id, StationRequest request) {
        Station station = requireStation(id);
        applyStation(station, request);
        return toStationResponse(saveStation(station));
    }

    public void deleteStation(Long id) {
        Station station = requireStation(id);
        // Remove os vínculos de patrimônio (asset_assignments é ON DELETE RESTRICT).
        // O histórico permanece em asset_movements (ON DELETE SET NULL) e as
        // responsabilidades são removidas em cascata (ON DELETE CASCADE).
        assetAssignmentRepository.deleteAll(assetAssignmentRepository.findByStationId(id));
        stationRepository.delete(station);
    }

    public List<AssetInventoryResponse> listAssetsFlat(String search) {
        return assetRepository.findAll().stream()
            .filter(asset -> search == null || search.isBlank()
                || asset.getAssetCode().toLowerCase().contains(search.toLowerCase())
                || asset.getDescription().toLowerCase().contains(search.toLowerCase()))
            .sorted(Comparator.comparing(Asset::getAssetCode, String.CASE_INSENSITIVE_ORDER))
            .map(this::toAssetInventoryResponse)
            .toList();
    }

    public AssetInventoryResponse createAsset(AssetRequest request, String actor) {
        ensureStatusCanBeSetOnCreate(request.status());
        Asset asset = new Asset();
        applyAsset(asset, request);
        assetPolicyService.applyDefaults(asset);
        Asset saved = saveAsset(asset);
        registerMovement(saved, MovementType.CREATED, null, null, actor, "Cadastro inicial");
        return toAssetInventoryResponse(saved);
    }

    public AssetInventoryResponse updateAsset(Long id, AssetRequest request, String actor) {
        Asset asset = requireAsset(id);
        AssetStatus previousStatus = asset.getStatus();
        ensureStatusCanBeChangedManually(previousStatus, request.status());
        applyAsset(asset, request);
        Asset saved = saveAsset(asset);
        MovementType movementType = previousStatus == request.status() ? MovementType.UPDATED : MovementType.STATUS_CHANGED;
        String reason = previousStatus == request.status()
            ? "Atualizacao cadastral"
            : "Status alterado de " + previousStatus.name() + " para " + request.status().name();
        registerMovement(saved, movementType, null, null, actor, reason);
        return toAssetInventoryResponse(saved);
    }

    public AssetInventoryResponse voidAsset(Long id, String reason, String actor) {
        Asset asset = requireAsset(id);
        if (asset.getStatus() == AssetStatus.DISPOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Patrimonio baixado nao pode ser anulado");
        }
        if (asset.getStatus() == AssetStatus.VOIDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Patrimonio ja esta anulado");
        }
        if (assetAssignmentRepository.existsByAssetId(id)
            || assetDisposalItemRepository.existsByAsset_Id(id)
            || responsibilityTermItemRepository.existsByAsset_Id(id)
            || equipmentExchangeTermRepository.existsByRetiredAssetIdOrDeliveredAssetId(id, id)
            || physicalCheckRepository.existsByAssetId(id)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Patrimonio possui vinculos ou historico operacional e nao pode ser anulado"
            );
        }
        asset.setStatus(AssetStatus.VOIDED);
        asset.setVoidedAt(LocalDateTime.now());
        asset.setVoidedBy(blankToNull(actor));
        asset.setVoidReason(reason.trim());
        Asset saved = assetRepository.save(asset);
        registerMovement(saved, MovementType.VOIDED, null, null, actor, reason.trim());
        return toAssetInventoryResponse(saved);
    }

    public AssetInventoryResponse linkAsset(Long assetId, Long stationId, String performedBy, String reason) {
        ensureMovementReason(reason);
        Asset asset = requireAsset(assetId);
        Station station = requireStation(stationId);
        if (asset.getStatus() == AssetStatus.DISPOSED || asset.getStatus() == AssetStatus.VOIDED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patrimonio baixado ou anulado nao pode ser vinculado");
        }
        if (station.getStatus() == StationStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estacao inativa nao pode receber patrimonio");
        }
        if (assetAssignmentRepository.findByAssetIdAndStatus(assetId, AssignmentStatus.ACTIVE).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Patrimonio ja possui vinculo ativo");
        }

        AssetAssignment assignment = new AssetAssignment();
        assignment.setAsset(asset);
        assignment.setStation(station);
        assignment.setAssignedAt(LocalDateTime.now());
        assignment.setAssignedBy(blankToNull(performedBy));
        assignment.setStatus(AssignmentStatus.ACTIVE);
        assignment.setNotes(blankToNull(reason));
        assetAssignmentRepository.save(assignment);

        registerMovement(asset, MovementType.LINKED, null, station, performedBy, reason);
        return toAssetInventoryResponse(asset);
    }

    public AssetInventoryResponse unlinkAsset(Long assetId, String performedBy, String reason) {
        ensureMovementReason(reason);
        Asset asset = requireAsset(assetId);
        AssetAssignment assignment = assetAssignmentRepository.findByAssetIdAndStatus(assetId, AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao possui vinculo ativo"));
        Station fromStation = assignment.getStation();
        assignment.setStatus(AssignmentStatus.RETURNED);
        assignment.setUnassignedAt(LocalDateTime.now());
        assignment.setNotes(blankToNull(reason));
        registerMovement(asset, MovementType.UNLINKED, fromStation, null, performedBy, reason);
        return toAssetInventoryResponse(asset);
    }

    public AssetInventoryResponse transferAsset(Long assetId, TransferAssetRequest request) {
        ensureMovementReason(request.reason());
        Asset asset = requireAsset(assetId);
        if (asset.getStatus() == AssetStatus.DISPOSED || asset.getStatus() == AssetStatus.VOIDED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patrimonio baixado ou anulado nao pode ser transferido");
        }
        AssetAssignment current = assetAssignmentRepository.findByAssetIdAndStatus(assetId, AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao possui vinculo ativo"));
        Station fromStation = current.getStation();
        Station toStation = requireStation(request.toStationId());
        if (toStation.getStatus() == StationStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estacao destino inativa");
        }
        current.setStatus(AssignmentStatus.RETURNED);
        current.setUnassignedAt(LocalDateTime.now());
        assetAssignmentRepository.saveAndFlush(current);

        AssetAssignment next = new AssetAssignment();
        next.setAsset(asset);
        next.setStation(toStation);
        next.setAssignedAt(LocalDateTime.now());
        next.setAssignedBy(blankToNull(request.performedBy()));
        next.setStatus(AssignmentStatus.ACTIVE);
        next.setNotes(blankToNull(request.reason()));
        assetAssignmentRepository.save(next);

        registerMovement(asset, MovementType.TRANSFERRED, fromStation, toStation, request.performedBy(), request.reason());
        return toAssetInventoryResponse(asset);
    }

    public StationResponse changeResponsible(Long stationId, ChangeResponsibleRequest request) {
        Station station = requireStation(stationId);
        StationResponsibility currentForStation = stationResponsibilityRepository.findByStationIdAndCurrentTrue(stationId).orElse(null);

        if (request.employeeId() != null) {
            Employee employee = requireEmployee(request.employeeId());
            if (currentForStation != null && currentForStation.getEmployee().getId().equals(employee.getId())) {
                return toStationResponse(station);
            }

            List<StationResponsibility> currentForEmployee = stationResponsibilityRepository
                .findByEmployeeIdAndCurrentTrue(employee.getId())
                .stream()
                .filter(responsibility -> !responsibility.getStation().getId().equals(stationId))
                .toList();

            if (!currentForEmployee.isEmpty() && !Boolean.TRUE.equals(request.forceMove())) {
                String currentStationCode = currentForEmployee.getFirst().getStation().getCode();
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    employee.getFullName() + " ja e responsavel pela estacao " + currentStationCode
                );
            }

            currentForEmployee.forEach(current -> {
                current.setCurrent(false);
                current.setEndedAt(LocalDateTime.now());
                current.setNotes("Movido para a estacao " + station.getCode());
            });
        }

        if (currentForStation != null) {
            currentForStation.setCurrent(false);
            currentForStation.setEndedAt(LocalDateTime.now());
            currentForStation.setNotes(blankToNull(request.notes()));
        }
        stationResponsibilityRepository.flush();

        if (request.employeeId() != null) {
            Employee employee = requireEmployee(request.employeeId());
            StationResponsibility responsibility = new StationResponsibility();
            responsibility.setStation(station);
            responsibility.setEmployee(employee);
            responsibility.setStartedAt(LocalDateTime.now());
            responsibility.setCurrent(true);
            responsibility.setNotes(blankToNull(request.notes()));
            stationResponsibilityRepository.save(responsibility);
        }

        return toStationResponse(station);
    }

    private void endCurrentResponsibility(Long stationId, String notes) {
        stationResponsibilityRepository.findByStationIdAndCurrentTrue(stationId)
            .ifPresent(current -> {
                current.setCurrent(false);
                current.setEndedAt(LocalDateTime.now());
                current.setNotes(blankToNull(notes));
            });
    }

    public List<HistoryEventResponse> getStationHistory(Long stationId) {
        requireStation(stationId);
        List<HistoryEventResponse> events = new ArrayList<>();
        stationResponsibilityRepository.findByStationIdOrderByStartedAtDesc(stationId)
            .forEach(resp -> {
                events.add(new HistoryEventResponse(
                    "RESPONSIBILITY_CHANGED",
                    "Responsavel definido: " + resp.getEmployee().getFullName(),
                    resp.getStartedAt()
                ));
                if (resp.getEndedAt() != null) {
                    events.add(new HistoryEventResponse(
                        "RESPONSIBILITY_ENDED",
                        "Responsavel encerrado: " + resp.getEmployee().getFullName(),
                        resp.getEndedAt()
                    ));
                }
            });

        assetMovementRepository.findByFromStationIdOrToStationIdOrderByMovedAtDesc(stationId, stationId)
            .forEach(movement -> events.add(toHistoryResponse(movement)));

        return events.stream()
            .sorted(Comparator.comparing(HistoryEventResponse::timestamp).reversed())
            .toList();
    }

    public List<HistoryEventResponse> getAssetHistory(Long assetId) {
        requireAsset(assetId);
        return assetMovementRepository.findByAssetIdOrderByMovedAtDesc(assetId).stream()
            .map(this::toHistoryResponse)
            .toList();
    }

    /** Listagem global de movimentacoes de localizacao (entradas, saidas e transferencias). */
    public List<MovementResponse> listMovements() {
        List<MovementType> types = List.of(
            MovementType.LINKED, MovementType.UNLINKED, MovementType.TRANSFERRED, MovementType.EXCHANGED);
        return assetMovementRepository.findByMovementTypeInOrderByMovedAtDesc(types).stream()
            .map(this::toMovementResponse)
            .toList();
    }

    private MovementResponse toMovementResponse(AssetMovement movement) {
        Asset asset = movement.getAsset();
        Station fromStation = movement.getFromStation();
        Station toStation = movement.getToStation();
        Employee fromEmployee = movement.getFromEmployee();
        Employee toEmployee = movement.getToEmployee();
        return new MovementResponse(
            movement.getId(),
            asset == null ? null : asset.getId(),
            asset == null ? null : asset.getAssetCode(),
            asset == null ? null : asset.getType(),
            asset == null ? null : asset.getDescription(),
            movement.getMovementType().name(),
            movement.getMovedAt(),
            fromStation == null ? null : fromStation.getCode(),
            fromStation == null ? null : fromStation.getName(),
            toStation == null ? null : toStation.getCode(),
            toStation == null ? null : toStation.getName(),
            fromEmployee == null ? null : fromEmployee.getFullName(),
            toEmployee == null ? null : toEmployee.getFullName(),
            movement.getMovedBy(),
            movement.getReason()
        );
    }

    private void applySpace(Space space, SpaceRequest request) {
        space.setName(request.name().trim());
        space.setType(request.type());
        space.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        space.setParent(request.parentId() == null ? null : requireSpace(request.parentId()));
    }

    private void applyEmployee(Employee employee, EmployeeRequest request) {
        employee.setFullName(request.fullName().trim());
        employee.setCpf(blankToNull(request.cpf()));
        employee.setJobTitle(blankToNull(request.jobTitle()));
        employee.setStatus(request.status());
        employee.setDepartment(request.departmentId() == null ? null : requireDepartment(request.departmentId()));
    }

    private void applyStation(Station station, StationRequest request) {
        station.setCode(request.code().trim());
        station.setName(request.name().trim());
        station.setLocationCode(blankToNull(request.locationCode()));
        station.setDescription(blankToNull(request.description()));
        station.setStatus(request.status());
        station.setObservation(blankToNull(request.observation()));
        station.setSpace(request.spaceId() == null ? null : requireSpace(request.spaceId()));
        station.setLayoutElementRef(blankToNull(request.layoutElementRef()));
        station.setPositionX(request.positionX());
        station.setPositionY(request.positionY());
        station.setPositionRotation(request.positionRotation());
        // Ausente = mantém o valor (telas que não editam a planta); AUTO = volta ao automático.
        if (request.partitionSide() != null) {
            station.setPartitionSide("AUTO".equals(request.partitionSide()) ? null : request.partitionSide());
        }
    }

    private void applyAsset(Asset asset, AssetRequest request) {
        asset.setAssetCode(request.assetCode().trim());
        asset.setType(request.type().trim());
        asset.setDescription(request.description().trim());
        asset.setSerialNumber(blankToNull(request.serialNumber()));
        asset.setStatus(request.status());
        asset.setOrigin(request.origin() == null ? AssetOrigin.MANUAL : request.origin());
        asset.setManufacturer(blankToNull(request.manufacturer()));
        asset.setModel(blankToNull(request.model()));
        asset.setProcessor(blankToNull(request.processor()));
        asset.setOperatingSystem(blankToNull(request.operatingSystem()));
        asset.setAcquisitionDate(request.acquisitionDate());
        asset.setFiscalNote(blankToNull(request.fiscalNote()));
        asset.setAccountingCategory(blankToNull(request.accountingCategory()));
        asset.setAccountingGroup(blankToNull(request.accountingGroup()));
        asset.setAccountingTreatment(blankToNull(request.accountingTreatment()));
        asset.setAcquisitionValue(request.acquisitionValue());
        asset.setDepreciationRate(request.depreciationRate());
        asset.setUsefulLifeYears(request.usefulLifeYears());
        asset.setUsefulLifeMonths(request.usefulLifeMonths());
        asset.setResidualValue(request.residualValue());
        asset.setDepreciationStartDate(request.depreciationStartDate());
        asset.setDepreciationMethod(blankToNull(request.depreciationMethod()));
        asset.setWarrantyUntil(request.warrantyUntil());
        asset.setNotes(blankToNull(request.notes()));
        asset.setNfeAccessKey(blankToNull(request.nfeAccessKey()));
        asset.setFiscalNoteSeries(blankToNull(request.fiscalNoteSeries()));
        asset.setSupplierName(blankToNull(request.supplierName()));
        asset.setAcquisitionBatch(blankToNull(request.acquisitionBatch()));
        asset.setNfItemCode(blankToNull(request.nfItemCode()));
        asset.setSupplierOrder(blankToNull(request.supplierOrder()));
        asset.setInitialCondition(blankToNull(request.initialCondition()));
        asset.setConditionGrade(blankToNull(request.conditionGrade()));
        asset.setFunctionalStatus(blankToNull(request.functionalStatus()));
        asset.setConditionNotes(blankToNull(request.conditionNotes()));
        asset.setPartNumber(blankToNull(request.partNumber()));
        asset.setRegulatoryModel(blankToNull(request.regulatoryModel()));
        asset.setNcm(blankToNull(request.ncm()));
        asset.setEan(blankToNull(request.ean()));
        asset.setUpc(blankToNull(request.upc()));
        asset.setColor(blankToNull(request.color()));
        asset.setRam(blankToNull(request.ram()));
        asset.setStorage(blankToNull(request.storage()));
    }

    private Department saveDepartment(Department department) {
        try {
            return departmentRepository.save(department);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Departamento duplicado");
        }
    }

    private Employee saveEmployee(Employee employee) {
        try {
            return employeeRepository.save(employee);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF duplicado");
        }
    }

    private Station saveStation(Station station) {
        try {
            return stationRepository.save(station);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Codigo de estacao duplicado");
        }
    }

    private Asset saveAsset(Asset asset) {
        try {
            return assetRepository.save(asset);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Codigo patrimonial duplicado");
        }
    }

    private void registerMovement(Asset asset, MovementType type, Station fromStation, Station toStation, String performedBy, String reason) {
        AssetMovement movement = new AssetMovement();
        movement.setAsset(asset);
        movement.setMovementType(type);
        movement.setFromStation(fromStation);
        movement.setToStation(toStation);
        movement.setFromEmployee(currentResponsible(fromStation));
        movement.setToEmployee(currentResponsible(toStation));
        movement.setMovedBy(blankToNull(performedBy));
        movement.setReason(blankToNull(reason));
        movement.setMovedAt(LocalDateTime.now());
        assetMovementRepository.save(movement);
    }

    private void ensureMovementReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o motivo da movimentacao patrimonial");
        }
    }

    private Employee currentResponsible(Station station) {
        if (station == null) {
            return null;
        }
        return stationResponsibilityRepository.findByStationIdAndCurrentTrue(station.getId())
            .map(StationResponsibility::getEmployee)
            .orElse(null);
    }

    private HistoryEventResponse toHistoryResponse(AssetMovement movement) {
        Employee fromEmployee = movement.getFromEmployee();
        Employee toEmployee = movement.getToEmployee();
        return new HistoryEventResponse(
            movement.getMovementType().name(),
            buildMovementDescription(movement),
            movement.getMovedAt(),
            movement.getFromStation() == null ? null : movement.getFromStation().getId(),
            movement.getFromStation() == null ? null : movement.getFromStation().getCode(),
            movement.getToStation() == null ? null : movement.getToStation().getId(),
            movement.getToStation() == null ? null : movement.getToStation().getCode(),
            fromEmployee == null ? null : fromEmployee.getId(),
            fromEmployee == null ? null : fromEmployee.getFullName(),
            fromEmployee == null || fromEmployee.getDepartment() == null ? null : fromEmployee.getDepartment().getName(),
            toEmployee == null ? null : toEmployee.getId(),
            toEmployee == null ? null : toEmployee.getFullName(),
            toEmployee == null || toEmployee.getDepartment() == null ? null : toEmployee.getDepartment().getName(),
            movement.getMovedBy(),
            movement.getReason(),
            movement.getSourceProcessType(),
            movement.getSourceProcessId(),
            movement.getSourceProcessNumber()
        );
    }

    private Department requireDepartment(UUID id) {
        return departmentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Departamento nao encontrado"));
    }

    private Space requireSpace(Long id) {
        return spaceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaco nao encontrado"));
    }

    private Employee requireEmployee(UUID id) {
        return employeeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Funcionario nao encontrado"));
    }

    private Station requireStation(Long id) {
        return stationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estacao nao encontrada"));
    }

    private Asset requireAsset(Long id) {
        return assetRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
    }

    private DepartmentResponse toDepartmentResponse(Department department) {
        return new DepartmentResponse(department.getId(), department.getName());
    }

    private SpaceResponse toSpaceResponse(Space space) {
        return new SpaceResponse(
            space.getId(),
            space.getName(),
            space.getType(),
            space.getParent() == null ? null : space.getParent().getId(),
            space.getSortOrder()
        );
    }

    private EmployeeResponse toEmployeeResponse(Employee employee) {
        StationResponsibility current = stationResponsibilityRepository.findAll().stream()
            .filter(resp -> resp.isCurrent() && resp.getEmployee().getId().equals(employee.getId()))
            .findFirst()
            .orElse(null);
        return new EmployeeResponse(
            employee.getId(),
            employee.getFullName(),
            employee.getCpf(),
            employee.getJobTitle(),
            employee.getStatus(),
            employee.getDepartment() == null ? null : employee.getDepartment().getId(),
            employee.getDepartment() == null ? null : employee.getDepartment().getName(),
            current == null ? null : current.getStation().getId(),
            current == null ? null : current.getStation().getCode()
        );
    }

    private StationResponse toStationResponse(Station station) {
        StationResponsibility current = stationResponsibilityRepository.findByStationIdAndCurrentTrue(station.getId()).orElse(null);
        Employee employee = current == null ? null : current.getEmployee();
        Department department = employee == null ? null : employee.getDepartment();
        long assetCount = assetAssignmentRepository.findByStationIdAndStatus(station.getId(), AssignmentStatus.ACTIVE).size();

        return new StationResponse(
            station.getId(),
            station.getCode(),
            station.getName(),
            station.getLocationCode(),
            station.getDescription(),
            station.getStatus(),
            station.getObservation(),
            station.getSpace() == null ? null : station.getSpace().getId(),
            station.getSpace() == null ? null : station.getSpace().getName(),
            station.getLayoutElementRef(),
            station.getLastInventoryCheckAt(),
            employee == null ? null : employee.getId(),
            employee == null ? null : employee.getFullName(),
            department == null ? null : department.getId(),
            department == null ? null : department.getName(),
            station.getPositionX(),
            station.getPositionY(),
            station.getPositionRotation(),
            station.getPartitionSide(),
            station.getLastConferenceAt(),
            station.getLastConferenceBy(),
            assetCount
        );
    }

    private AssetInventoryResponse toAssetInventoryResponse(Asset asset) {
        AssetAssignment current = assetAssignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE).orElse(null);
        Station station = current == null ? null : current.getStation();
        StationResponsibility responsibility = station == null ? null : stationResponsibilityRepository.findByStationIdAndCurrentTrue(station.getId()).orElse(null);
        Employee employee = responsibility == null ? null : responsibility.getEmployee();
        Department department = employee == null ? null : employee.getDepartment();
        return new AssetInventoryResponse(
            asset.getId(),
            asset.getAssetCode(),
            asset.getType(),
            asset.getDescription(),
            asset.getSerialNumber(),
            asset.getManufacturer(),
            asset.getModel(),
            asset.getProcessor(),
            asset.getOperatingSystem(),
            asset.getStatus(),
            asset.getOrigin(),
            station == null ? null : station.getId(),
            station == null ? null : station.getCode(),
            station == null ? null : station.getName(),
            station == null ? null : station.getStatus(),
            employee == null ? null : employee.getId(),
            employee == null ? null : employee.getFullName(),
            department == null ? null : department.getId(),
            department == null ? null : department.getName(),
            current == null ? null : current.getAssignedAt(),
            asset.getLastInventoryCheckAt(),
            asset.getUpdatedAt(),
            asset.getAcquisitionDate(),
            asset.getFiscalNote(),
            asset.getAccountingCategory(),
            asset.getAccountingGroup(),
            asset.getAccountingTreatment(),
            asset.getAcquisitionValue(),
            asset.getDepreciationRate(),
            asset.getUsefulLifeYears(),
            asset.getUsefulLifeMonths(),
            asset.getResidualValue(),
            asset.getDepreciationStartDate(),
            asset.getDepreciationMethod(),
            asset.getPolicyVersion(),
            asset.getWarrantyUntil(),
            asset.getNotes(),
            asset.getLastCheckAt(),
            asset.getLastCheckBy(),
            asset.getLastCheckResult(),
            asset.getVoidedAt(),
            asset.getVoidedBy(),
            asset.getVoidReason(),
            asset.getNfeAccessKey(),
            asset.getFiscalNoteSeries(),
            asset.getSupplierName(),
            asset.getAcquisitionBatch(),
            asset.getNfItemCode(),
            asset.getSupplierOrder(),
            asset.getInitialCondition(),
            asset.getConditionGrade(),
            asset.getFunctionalStatus(),
            asset.getConditionNotes(),
            asset.getPartNumber(),
            asset.getRegulatoryModel(),
            asset.getNcm(),
            asset.getEan(),
            asset.getUpc(),
            asset.getColor(),
            asset.getRam(),
            asset.getStorage()
        );
    }

    private String buildMovementDescription(AssetMovement movement) {
        String assetCode = movement.getAsset() == null ? "(excluído)" : movement.getAsset().getAssetCode();
        String description = switch (movement.getMovementType()) {
            case CREATED -> "Patrimonio " + assetCode + " criado";
            case UPDATED -> "Patrimonio " + assetCode + " atualizado";
            case LINKED -> "Patrimonio " + assetCode + " vinculado a " + safeStation(movement.getToStation());
            case UNLINKED -> "Patrimonio " + assetCode + " desvinculado de " + safeStation(movement.getFromStation());
            case TRANSFERRED -> "Patrimonio " + assetCode + " transferido de " + safeStation(movement.getFromStation()) + " para " + safeStation(movement.getToStation());
            case STATUS_CHANGED -> "Status do patrimonio " + assetCode + " alterado";
            case INVENTORY_CHECKED -> "Conferencia registrada para " + assetCode;
            case VOIDED -> "Cadastro do patrimonio " + assetCode + " anulado";
            case EXCHANGED -> "Patrimonio " + assetCode + " movimentado pela troca "
                + (movement.getSourceProcessNumber() == null ? "" : movement.getSourceProcessNumber());
        };
        return description + (movement.getMovedBy() == null ? "" : " · por " + movement.getMovedBy())
            + (movement.getReason() == null ? "" : " · " + movement.getReason());
    }

    private String safeStation(Station station) {
        return station == null ? "sem estacao" : station.getCode();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void ensureStatusCanBeSetOnCreate(AssetStatus status) {
        if (status == AssetStatus.DISPOSED || status == AssetStatus.VOIDED) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Status BAIXADO ou ANULADO so pode ser produzido por processo formal"
            );
        }
    }

    private void ensureStatusCanBeChangedManually(AssetStatus current, AssetStatus requested) {
        if (current == AssetStatus.VOIDED || current == AssetStatus.DISPOSED) {
            if (current != requested) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status protegido nao pode ser alterado manualmente");
            }
            return;
        }
        if (requested == AssetStatus.DISPOSED || requested == AssetStatus.VOIDED) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Patrimonio so pode ser baixado pela finalizacao de uma baixa patrimonial"
            );
        }
    }
}
