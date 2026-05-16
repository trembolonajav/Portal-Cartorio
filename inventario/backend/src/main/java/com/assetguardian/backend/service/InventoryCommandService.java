package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetInventoryResponse;
import com.assetguardian.backend.api.dto.AssetRequest;
import com.assetguardian.backend.api.dto.ChangeResponsibleRequest;
import com.assetguardian.backend.api.dto.DepartmentRequest;
import com.assetguardian.backend.api.dto.DepartmentResponse;
import com.assetguardian.backend.api.dto.EmployeeRequest;
import com.assetguardian.backend.api.dto.EmployeeResponse;
import com.assetguardian.backend.api.dto.HistoryEventResponse;
import com.assetguardian.backend.api.dto.SpaceRequest;
import com.assetguardian.backend.api.dto.SpaceResponse;
import com.assetguardian.backend.api.dto.StationRequest;
import com.assetguardian.backend.api.dto.StationResponse;
import com.assetguardian.backend.api.dto.TransferAssetRequest;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetOrigin;
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
import com.assetguardian.backend.repository.DepartmentRepository;
import com.assetguardian.backend.repository.EmployeeRepository;
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
    private final StationResponsibilityRepository stationResponsibilityRepository;

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
        assetAssignmentRepository.findByStationIdAndStatus(id, AssignmentStatus.ACTIVE)
            .forEach(assignment -> {
                assignment.setStatus(AssignmentStatus.RETURNED);
                assignment.setUnassignedAt(LocalDateTime.now());
            });
        stationResponsibilityRepository.findByStationIdAndCurrentTrue(id)
            .ifPresent(resp -> {
                resp.setCurrent(false);
                resp.setEndedAt(LocalDateTime.now());
            });
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

    public AssetInventoryResponse createAsset(AssetRequest request) {
        Asset asset = new Asset();
        applyAsset(asset, request);
        Asset saved = saveAsset(asset);
        registerMovement(saved, MovementType.CREATED, null, null, "system", "Cadastro inicial");
        return toAssetInventoryResponse(saved);
    }

    public AssetInventoryResponse updateAsset(Long id, AssetRequest request) {
        Asset asset = requireAsset(id);
        applyAsset(asset, request);
        Asset saved = saveAsset(asset);
        registerMovement(saved, MovementType.UPDATED, null, null, "system", "Atualizacao cadastral");
        return toAssetInventoryResponse(saved);
    }

    public void deleteAsset(Long id) {
        Asset asset = requireAsset(id);
        assetAssignmentRepository.findByAssetIdAndStatus(id, AssignmentStatus.ACTIVE)
            .ifPresent(assignment -> {
                assignment.setStatus(AssignmentStatus.RETURNED);
                assignment.setUnassignedAt(LocalDateTime.now());
            });
        assetRepository.delete(asset);
    }

    public AssetInventoryResponse linkAsset(Long assetId, Long stationId, String performedBy, String reason) {
        Asset asset = requireAsset(assetId);
        Station station = requireStation(stationId);
        if (asset.getStatus() == com.assetguardian.backend.domain.AssetStatus.DISPOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patrimonio baixado nao pode ser vinculado");
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
        Asset asset = requireAsset(assetId);
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
            .forEach(movement -> events.add(new HistoryEventResponse(
                movement.getMovementType().name(),
                buildMovementDescription(movement),
                movement.getMovedAt()
            )));

        return events.stream()
            .sorted(Comparator.comparing(HistoryEventResponse::timestamp).reversed())
            .toList();
    }

    public List<HistoryEventResponse> getAssetHistory(Long assetId) {
        requireAsset(assetId);
        return assetMovementRepository.findByAssetIdOrderByMovedAtDesc(assetId).stream()
            .map(movement -> new HistoryEventResponse(
                movement.getMovementType().name(),
                buildMovementDescription(movement),
                movement.getMovedAt()
            ))
            .toList();
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
        asset.setNotes(blankToNull(request.notes()));
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
        movement.setMovedBy(blankToNull(performedBy));
        movement.setReason(blankToNull(reason));
        movement.setMovedAt(LocalDateTime.now());
        assetMovementRepository.save(movement);
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
            asset.getUpdatedAt()
        );
    }

    private String buildMovementDescription(AssetMovement movement) {
        String assetCode = movement.getAsset().getAssetCode();
        return switch (movement.getMovementType()) {
            case CREATED -> "Patrimonio " + assetCode + " criado";
            case UPDATED -> "Patrimonio " + assetCode + " atualizado";
            case LINKED -> "Patrimonio " + assetCode + " vinculado a " + safeStation(movement.getToStation());
            case UNLINKED -> "Patrimonio " + assetCode + " desvinculado de " + safeStation(movement.getFromStation());
            case TRANSFERRED -> "Patrimonio " + assetCode + " transferido de " + safeStation(movement.getFromStation()) + " para " + safeStation(movement.getToStation());
            case STATUS_CHANGED -> "Status do patrimonio " + assetCode + " alterado";
            case INVENTORY_CHECKED -> "Conferencia registrada para " + assetCode;
        };
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
}
