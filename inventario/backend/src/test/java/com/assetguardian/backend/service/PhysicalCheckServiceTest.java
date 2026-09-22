package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.PhysicalCheckRequest;
import com.assetguardian.backend.domain.*;
import com.assetguardian.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PhysicalCheckServiceTest {
    private final AssetRepository assets = mock(AssetRepository.class);
    private final StationRepository stations = mock(StationRepository.class);
    private final PhysicalCheckRepository checks = mock(PhysicalCheckRepository.class);
    private final AssetAssignmentRepository assignments = mock(AssetAssignmentRepository.class);
    private final InventoryCommandService commands = mock(InventoryCommandService.class);
    private final ConferenceFinalizationRepository finalizations = mock(ConferenceFinalizationRepository.class);
    private final PhysicalCheckService service = new PhysicalCheckService(assets, stations, checks, assignments, commands, finalizations);

    @Test void transferKeepsOriginalLocationAndAuthenticatedAuthor() {
        Asset asset = new Asset(); asset.setId(1L); asset.setAssetCode("P001");
        Station from = new Station(); from.setId(2L); from.setCode("A");
        Station to = new Station(); to.setId(3L); to.setCode("B");
        AssetAssignment assignment = new AssetAssignment(); assignment.setStation(from);
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
        when(stations.findById(3L)).thenReturn(Optional.of(to));
        when(assignments.findByAssetIdAndStatus(1L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(assignment));
        var response = service.recordCheck(1L, new PhysicalCheckRequest(CheckResult.FOUND, null, 3L, true, "Transferido A para B"), "maria");
        verify(commands).transferAsset(eq(1L), argThat(r -> r.toStationId().equals(3L) && r.performedBy().equals("maria")));
        assertEquals(2L, response.expectedStationId());
        assertEquals(3L, response.stationId());
        assertEquals("maria", response.checkedBy());
        assertNotNull(response.checkedAt());
        assertEquals(response.checkedAt(), asset.getLastCheckAt());
        verify(checks).save(any(PhysicalCheck.class));
    }

    @Test void everyFinalizationAppendsAnAuditRecord() {
        Station station = new Station(); station.setId(3L);
        when(stations.findById(3L)).thenReturn(Optional.of(station));
        service.finalizeStationConference(3L, "maria");
        service.finalizeStationConference(3L, "joao");
        var records = ArgumentCaptor.forClass(ConferenceFinalization.class);
        verify(finalizations, times(2)).save(records.capture());
        assertEquals("maria", records.getAllValues().get(0).getCheckedBy());
        assertEquals("joao", records.getAllValues().get(1).getCheckedBy());
        assertNotNull(records.getValue().getCheckedAt());
    }

    @Test void failedTransferDoesNotRecordASuccessfulCheck() {
        Asset asset = new Asset(); asset.setId(1L);
        Station from = new Station(); from.setId(2L);
        Station to = new Station(); to.setId(3L);
        AssetAssignment assignment = new AssetAssignment(); assignment.setStation(from);
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
        when(stations.findById(3L)).thenReturn(Optional.of(to));
        when(assignments.findByAssetIdAndStatus(1L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(assignment));
        doThrow(new IllegalStateException("Falha")).when(commands).transferAsset(eq(1L), any());
        assertThrows(IllegalStateException.class, () -> service.recordCheck(1L, new PhysicalCheckRequest(CheckResult.FOUND, null, 3L, true, null), "maria"));
        verify(checks, never()).save(any());
    }
}
