package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetInventoryResponse;
import com.assetguardian.backend.api.dto.AssetRequest;
import com.assetguardian.backend.api.dto.ChangeResponsibleRequest;
import com.assetguardian.backend.api.dto.DepartmentRequest;
import com.assetguardian.backend.api.dto.DepartmentResponse;
import com.assetguardian.backend.api.dto.EmployeeRequest;
import com.assetguardian.backend.api.dto.EmployeeResponse;
import com.assetguardian.backend.api.dto.HistoryEventResponse;
import com.assetguardian.backend.api.dto.LinkAssetRequest;
import com.assetguardian.backend.api.dto.SpaceRequest;
import com.assetguardian.backend.api.dto.SpaceResponse;
import com.assetguardian.backend.api.dto.StationRequest;
import com.assetguardian.backend.api.dto.StationResponse;
import com.assetguardian.backend.api.dto.TransferAssetRequest;
import com.assetguardian.backend.service.InventoryCommandService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InventoryManagementController {

    private final InventoryCommandService inventoryCommandService;

    @GetMapping("/departments")
    public List<DepartmentResponse> listDepartments() {
        return inventoryCommandService.listDepartments();
    }

    @PostMapping("/departments")
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse createDepartment(@Valid @RequestBody DepartmentRequest request) {
        return inventoryCommandService.createDepartment(request);
    }

    @PutMapping("/departments/{id}")
    public DepartmentResponse updateDepartment(@PathVariable UUID id, @Valid @RequestBody DepartmentRequest request) {
        return inventoryCommandService.updateDepartment(id, request);
    }

    @DeleteMapping("/departments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDepartment(@PathVariable UUID id) {
        inventoryCommandService.deleteDepartment(id);
    }

    @GetMapping("/spaces")
    public List<SpaceResponse> listSpaces() {
        return inventoryCommandService.listSpaces();
    }

    @PostMapping("/spaces")
    @ResponseStatus(HttpStatus.CREATED)
    public SpaceResponse createSpace(@Valid @RequestBody SpaceRequest request) {
        return inventoryCommandService.createSpace(request);
    }

    @PutMapping("/spaces/{id}")
    public SpaceResponse updateSpace(@PathVariable Long id, @Valid @RequestBody SpaceRequest request) {
        return inventoryCommandService.updateSpace(id, request);
    }

    @DeleteMapping("/spaces/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSpace(@PathVariable Long id) {
        inventoryCommandService.deleteSpace(id);
    }

    @GetMapping("/employees")
    public List<EmployeeResponse> listEmployees() {
        return inventoryCommandService.listEmployees();
    }

    @PostMapping("/employees")
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeResponse createEmployee(@Valid @RequestBody EmployeeRequest request) {
        return inventoryCommandService.createEmployee(request);
    }

    @PutMapping("/employees/{id}")
    public EmployeeResponse updateEmployee(@PathVariable UUID id, @Valid @RequestBody EmployeeRequest request) {
        return inventoryCommandService.updateEmployee(id, request);
    }

    @DeleteMapping("/employees/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEmployee(@PathVariable UUID id) {
        inventoryCommandService.deleteEmployee(id);
    }

    @GetMapping("/stations")
    public List<StationResponse> listStations() {
        return inventoryCommandService.listStations();
    }

    @PostMapping("/stations")
    @ResponseStatus(HttpStatus.CREATED)
    public StationResponse createStation(@Valid @RequestBody StationRequest request) {
        return inventoryCommandService.createStation(request);
    }

    @PutMapping("/stations/{id}")
    public StationResponse updateStation(@PathVariable Long id, @Valid @RequestBody StationRequest request) {
        return inventoryCommandService.updateStation(id, request);
    }

    @DeleteMapping("/stations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStation(@PathVariable Long id) {
        inventoryCommandService.deleteStation(id);
    }

    @PutMapping("/stations/{id}/responsible")
    public StationResponse changeResponsible(@PathVariable Long id, @Valid @RequestBody ChangeResponsibleRequest request) {
        return inventoryCommandService.changeResponsible(id, request);
    }

    @GetMapping("/stations/{id}/history")
    public List<HistoryEventResponse> getStationHistory(@PathVariable Long id) {
        return inventoryCommandService.getStationHistory(id);
    }

    @PostMapping("/assets")
    @ResponseStatus(HttpStatus.CREATED)
    public AssetInventoryResponse createAsset(@Valid @RequestBody AssetRequest request) {
        return inventoryCommandService.createAsset(request);
    }

    @PutMapping("/assets/{id}")
    public AssetInventoryResponse updateAsset(@PathVariable Long id, @Valid @RequestBody AssetRequest request) {
        return inventoryCommandService.updateAsset(id, request);
    }

    @DeleteMapping("/assets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAsset(@PathVariable Long id) {
        inventoryCommandService.deleteAsset(id);
    }

    @PostMapping("/assets/{id}/link")
    public AssetInventoryResponse linkAsset(@PathVariable Long id, @Valid @RequestBody LinkAssetRequest request) {
        return inventoryCommandService.linkAsset(id, request.stationId(), request.performedBy(), request.reason());
    }

    @PostMapping("/assets/{id}/unlink")
    public AssetInventoryResponse unlinkAsset(
        @PathVariable Long id,
        @RequestParam(required = false) String performedBy,
        @RequestParam(required = false) String reason
    ) {
        return inventoryCommandService.unlinkAsset(id, performedBy, reason);
    }

    @PostMapping("/assets/{id}/transfer")
    public AssetInventoryResponse transferAsset(@PathVariable Long id, @Valid @RequestBody TransferAssetRequest request) {
        return inventoryCommandService.transferAsset(id, request);
    }

    @GetMapping("/assets-flat")
    public List<AssetInventoryResponse> listAssetsFlat(@RequestParam(required = false) String search) {
        return inventoryCommandService.listAssetsFlat(search);
    }

    @GetMapping("/assets/{id}/history")
    public List<HistoryEventResponse> getAssetHistory(@PathVariable Long id) {
        return inventoryCommandService.getAssetHistory(id);
    }
}
