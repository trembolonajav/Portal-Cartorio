package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetRequestCreateRequest;
import com.assetguardian.backend.api.dto.AssetRequestDecisionRequest;
import com.assetguardian.backend.api.dto.AssetRequestResponse;
import com.assetguardian.backend.domain.AssetRequest;
import com.assetguardian.backend.domain.AssetRequestPriority;
import com.assetguardian.backend.domain.AssetRequestStatus;
import com.assetguardian.backend.repository.AssetRequestRepository;
import java.time.LocalDateTime;
import java.time.Year;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class AssetRequestService {

    private final AssetRequestRepository requestRepository;

    @Transactional(readOnly = true)
    public java.util.List<AssetRequestResponse> list() {
        return requestRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public AssetRequestResponse create(AssetRequestCreateRequest request) {
        AssetRequest entity = new AssetRequest();
        entity.setNumber(nextNumber());
        entity.setType(request.type());
        entity.setPriority(request.priority() == null ? AssetRequestPriority.MEDIUM : request.priority());
        entity.setStatus(AssetRequestStatus.PENDING);
        entity.setTitle(request.title().trim());
        entity.setDescription(request.description().trim());
        entity.setRequestedBy(blankToNull(request.requestedBy()));
        entity.setDepartment(blankToNull(request.department()));
        return toResponse(requestRepository.save(entity));
    }

    public AssetRequestResponse approve(Long id, AssetRequestDecisionRequest request) {
        return decide(id, AssetRequestStatus.APPROVED, request);
    }

    public AssetRequestResponse reject(Long id, AssetRequestDecisionRequest request) {
        return decide(id, AssetRequestStatus.REJECTED, request);
    }

    public AssetRequestResponse cancel(Long id, AssetRequestDecisionRequest request) {
        return decide(id, AssetRequestStatus.CANCELLED, request);
    }

    private AssetRequestResponse decide(Long id, AssetRequestStatus status, AssetRequestDecisionRequest request) {
        AssetRequest entity = requireRequest(id);
        if (entity.getStatus() != AssetRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solicitacao ja foi decidida");
        }
        entity.setStatus(status);
        entity.setDecisionNote(request == null ? null : blankToNull(request.note()));
        entity.setDecidedBy(request == null ? null : blankToNull(request.username()));
        entity.setDecidedAt(LocalDateTime.now());
        return toResponse(entity);
    }

    private AssetRequest requireRequest(Long id) {
        return requestRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitacao nao encontrada"));
    }

    private AssetRequestResponse toResponse(AssetRequest e) {
        return new AssetRequestResponse(
            e.getId(),
            e.getNumber(),
            e.getType(),
            e.getPriority(),
            e.getStatus(),
            e.getTitle(),
            e.getDescription(),
            e.getRequestedBy(),
            e.getDepartment(),
            e.getDecisionNote(),
            e.getDecidedBy(),
            e.getDecidedAt(),
            e.getCreatedAt()
        );
    }

    private String nextNumber() {
        String prefix = "SOL-" + Year.now().getValue() + "-";
        long next = requestRepository.countByNumberStartingWith(prefix) + 1;
        return prefix + String.format("%04d", next);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
