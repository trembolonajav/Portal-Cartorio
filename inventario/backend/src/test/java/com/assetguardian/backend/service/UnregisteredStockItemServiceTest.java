package com.assetguardian.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.assetguardian.backend.api.dto.UnregisteredStockItemRequest;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.UnregisteredStockItem;
import com.assetguardian.backend.domain.UnregisteredStockItemStatus;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.UnregisteredStockItemPhotoRepository;
import com.assetguardian.backend.repository.UnregisteredStockItemRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class UnregisteredStockItemServiceTest {

    private final UnregisteredStockItemRepository items = mock(UnregisteredStockItemRepository.class);
    private final UnregisteredStockItemPhotoRepository photos = mock(UnregisteredStockItemPhotoRepository.class);
    private final AssetRepository assets = mock(AssetRepository.class);
    private final UnregisteredStockItemService service = new UnregisteredStockItemService(items, photos, assets);

    @Test
    void createsPendingItemWithoutInventingAssetCode() {
        when(items.nextProvisionalCode()).thenReturn(7L);
        when(items.save(any(UnregisteredStockItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(
            new UnregisteredStockItemRequest("Teclado", "Teclado USB preto", "Dell", "KB216", null, "Etiqueta ausente", "FAIR", "WORKING", "Todas as teclas funcionam; teclas A/S/D desgastadas"),
            "gabriel"
        );

        assertEquals("PEND-00007", response.provisionalCode());
        assertEquals("PENDING", response.status());
        assertEquals("gabriel", response.foundBy());
        assertEquals("FAIR", response.conditionGrade());
        assertEquals("WORKING", response.functionalStatus());
        assertNull(response.registeredAssetId());
        verify(items).save(any(UnregisteredStockItem.class));
    }

    @Test
    void linksPendingItemToDefinitiveAssetAndKeepsHistory() {
        UnregisteredStockItem item = new UnregisteredStockItem();
        item.setProvisionalCode("PEND-00007");
        item.setType("Teclado");
        item.setDescription("Teclado USB preto");
        item.setStatus(UnregisteredStockItemStatus.PENDING);
        item.setConditionGrade("FAIR");
        item.setFunctionalStatus("WORKING");
        item.setConditionNotes("Todas as teclas funcionam; letras desgastadas");
        Asset asset = new Asset();
        asset.setAssetCode("2041");

        when(items.findById(7L)).thenReturn(Optional.of(item));
        when(assets.findByAssetCodeIgnoreCase("2041")).thenReturn(Optional.of(asset));
        when(items.save(item)).thenReturn(item);
        when(photos.findByItemIdOrderByUploadedAt(7L)).thenReturn(List.of());

        var response = service.resolve(7L, "2041", "gabriel");

        assertEquals("REGISTERED", response.status());
        assertEquals("2041", response.registeredAssetCode());
        assertEquals("gabriel", response.resolvedBy());
        assertEquals("FAIR", asset.getConditionGrade());
        assertEquals("WORKING", asset.getFunctionalStatus());
        assertEquals("Todas as teclas funcionam; letras desgastadas", asset.getConditionNotes());
        verify(assets).save(asset);
    }
}
