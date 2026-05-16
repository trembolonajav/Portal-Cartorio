package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.LayoutRequest;
import com.assetguardian.backend.api.dto.LayoutResponse;
import com.assetguardian.backend.domain.Space;
import com.assetguardian.backend.domain.SpaceLayout;
import com.assetguardian.backend.repository.SpaceLayoutRepository;
import com.assetguardian.backend.repository.SpaceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class SpaceLayoutService {

    private final SpaceLayoutRepository spaceLayoutRepository;
    private final SpaceRepository spaceRepository;
    private final ObjectMapper objectMapper;

    public LayoutResponse getBySpaceId(Long spaceId) {
        return spaceLayoutRepository.findBySpaceId(spaceId)
            .map(this::toResponse)
            .orElse(null);
    }

    public LayoutResponse save(Long spaceId, LayoutRequest request) {
        if (!spaceId.equals(request.spaceId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "spaceId da rota difere do corpo");
        }

        Space space = spaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Espaco nao encontrado"));

        SpaceLayout layout = spaceLayoutRepository.findBySpaceId(spaceId).orElseGet(SpaceLayout::new);
        layout.setSpace(space);
        layout.setName(request.name());
        layout.setCode(request.code());
        layout.setWidth(request.width());
        layout.setHeight(request.height());
        layout.setLayoutJson(writeJson(request));

        return toResponse(spaceLayoutRepository.save(layout));
    }

    private LayoutResponse toResponse(SpaceLayout layout) {
        try {
            LayoutResponse parsed = objectMapper.readValue(layout.getLayoutJson(), LayoutResponse.class);
            return new LayoutResponse(
                "layout-" + layout.getSpace().getId(),
                parsed.name(),
                parsed.code(),
                parsed.width(),
                parsed.height(),
                layout.getSpace().getId(),
                parsed.elements()
            );
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Layout salvo esta invalido");
        }
    }

    private String writeJson(LayoutRequest request) {
        try {
            LayoutResponse payload = new LayoutResponse(
                "layout-" + request.spaceId(),
                request.name(),
                request.code(),
                request.width(),
                request.height(),
                request.spaceId(),
                request.elements().stream()
                    .map(item -> new com.assetguardian.backend.api.dto.LayoutElementResponse(
                        item.id(),
                        item.elementType(),
                        item.layer(),
                        item.x(),
                        item.y(),
                        item.width(),
                        item.height(),
                        item.rotation(),
                        item.label(),
                        item.fillColor(),
                        item.strokeColor(),
                        item.fontSize(),
                        item.stationId(),
                        item.zIndex(),
                        item.metadata()
                    ))
                    .toList()
            );
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nao foi possivel serializar layout");
        }
    }
}
