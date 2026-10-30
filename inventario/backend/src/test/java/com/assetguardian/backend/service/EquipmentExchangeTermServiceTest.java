package com.assetguardian.backend.service;

import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.EmployeeStatus;
import com.assetguardian.backend.domain.EquipmentExchangeRetiredDestination;
import com.assetguardian.backend.domain.EquipmentExchangeTerm;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocumentType;
import com.assetguardian.backend.domain.EquipmentExchangeTermStatus;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.EquipmentExchangeTermDocumentRepository;
import com.assetguardian.backend.repository.EquipmentExchangeTermRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EquipmentExchangeTermServiceTest {

    private final EquipmentExchangeTermRepository terms = mock(EquipmentExchangeTermRepository.class);
    private final EquipmentExchangeTermDocumentRepository documents = mock(EquipmentExchangeTermDocumentRepository.class);
    private final AssetRepository assets = mock(AssetRepository.class);
    private final AssetAssignmentRepository assignments = mock(AssetAssignmentRepository.class);
    private final AssetMovementRepository movements = mock(AssetMovementRepository.class);
    private final StationResponsibilityRepository responsibilities = mock(StationResponsibilityRepository.class);
    private final EquipmentExchangeTermService service = new EquipmentExchangeTermService(
        terms, documents, assets, assignments, movements, responsibilities
    );

    @Test
    void completeMovesBothAssetsAndLinksTheAuditToTheSameProcess() {
        Station station = new Station();
        station.setId(10L);
        station.setCode("P-01");
        station.setName("Atendimento");

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFullName("Maria da Silva");
        employee.setStatus(EmployeeStatus.ACTIVE);
        StationResponsibility responsibility = new StationResponsibility();
        responsibility.setStation(station);
        responsibility.setEmployee(employee);
        responsibility.setCurrent(true);

        Asset retired = asset(1L, "PAT-001", AssetStatus.ACTIVE);
        Asset delivered = asset(2L, "PAT-002", AssetStatus.IN_STOCK);
        AssetAssignment oldAssignment = new AssetAssignment();
        oldAssignment.setAsset(retired);
        oldAssignment.setStation(station);
        oldAssignment.setStatus(AssignmentStatus.ACTIVE);

        EquipmentExchangeTerm term = new EquipmentExchangeTerm();
        term.setId(50L);
        term.setNumber("TE-2026-0001");
        term.setStatus(EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        term.setRetiredAssetId(retired.getId());
        term.setDeliveredAssetId(delivered.getId());
        term.setRetiredCodeSnapshot(retired.getAssetCode());
        term.setRetiredDescriptionSnapshot(retired.getDescription());
        term.setDeliveredCodeSnapshot(delivered.getAssetCode());
        term.setDeliveredDescriptionSnapshot(delivered.getDescription());
        term.setResponsibleName(employee.getFullName());
        term.setRetiredDestination(EquipmentExchangeRetiredDestination.MAINTENANCE);

        when(terms.findById(50L)).thenReturn(Optional.of(term));
        when(documents.existsByTermIdAndType(50L, EquipmentExchangeTermDocumentType.SIGNED_TERM)).thenReturn(true);
        when(documents.findByTermIdOrderByUploadedAtDesc(50L)).thenReturn(List.of());
        when(assets.findById(1L)).thenReturn(Optional.of(retired));
        when(assets.findById(2L)).thenReturn(Optional.of(delivered));
        when(assignments.findByAssetIdAndStatus(1L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(oldAssignment));
        when(assignments.findByAssetIdAndStatus(2L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(responsibilities.findByStationIdAndCurrentTrue(10L)).thenReturn(Optional.of(responsibility));

        var response = service.complete(50L, "tecnico.ti");

        assertEquals(EquipmentExchangeTermStatus.COMPLETED, response.status());
        assertNotNull(response.completedAt());
        assertEquals(AssignmentStatus.RETURNED, oldAssignment.getStatus());
        assertEquals(AssetStatus.MAINTENANCE, retired.getStatus());
        assertEquals(AssetStatus.ACTIVE, delivered.getStatus());

        ArgumentCaptor<AssetAssignment> assignmentCaptor = ArgumentCaptor.forClass(AssetAssignment.class);
        verify(assignments).save(assignmentCaptor.capture());
        AssetAssignment newAssignment = assignmentCaptor.getValue();
        assertEquals(delivered, newAssignment.getAsset());
        assertEquals(station, newAssignment.getStation());
        assertEquals(AssignmentStatus.ACTIVE, newAssignment.getStatus());
        assertEquals("tecnico.ti", newAssignment.getAssignedBy());

        ArgumentCaptor<AssetMovement> movementCaptor = ArgumentCaptor.forClass(AssetMovement.class);
        verify(movements, org.mockito.Mockito.times(2)).save(movementCaptor.capture());
        for (AssetMovement movement : movementCaptor.getAllValues()) {
            assertEquals(MovementType.EXCHANGED, movement.getMovementType());
            assertEquals("EQUIPMENT_EXCHANGE", movement.getSourceProcessType());
            assertEquals(50L, movement.getSourceProcessId());
            assertEquals("TE-2026-0001", movement.getSourceProcessNumber());
        }
    }

    private Asset asset(Long id, String code, AssetStatus status) {
        Asset asset = new Asset();
        asset.setId(id);
        asset.setAssetCode(code);
        asset.setType("Teclado");
        asset.setDescription("Teclado USB");
        asset.setStatus(status);
        return asset;
    }
}
