package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetPolicyRequest;
import com.assetguardian.backend.api.dto.AssetPolicyResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetPolicy;
import com.assetguardian.backend.repository.AssetPolicyRepository;
import com.assetguardian.backend.repository.AssetRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AssetPolicyService {
    private final AssetPolicyRepository policyRepository;
    private final AssetRepository assetRepository;

    public List<AssetPolicyResponse> list() {
        return policyRepository.findAllByOrderByAssetTypeAsc().stream().map(this::response).toList();
    }

    public AssetPolicyResponse update(Long id, AssetPolicyRequest request) {
        AssetPolicy policy = policyRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Politica patrimonial nao encontrada"));
        policy.setAssetType(request.assetType().trim());
        policy.setAccountingCategory(request.accountingCategory().trim());
        policy.setAccountingGroup(blankToNull(request.accountingGroup()));
        policy.setAccountingTreatment(request.accountingTreatment().trim());
        policy.setUsefulLifeMonths(request.usefulLifeMonths());
        policy.setResidualRate(request.residualRate());
        policy.setDepreciationMethod(request.depreciationMethod().trim());
        policy.setActive(request.active());
        policy.setPolicyVersion(policy.getPolicyVersion() + 1);
        policy.setUpdatedAt(LocalDateTime.now());
        AssetPolicy saved = policyRepository.save(policy);
        if (request.applyToExisting()) {
            List<Asset> affected = assetRepository.findAll().stream()
                .filter(asset -> asset.getType().equalsIgnoreCase(saved.getAssetType()))
                .peek(asset -> apply(asset, saved, true))
                .toList();
            assetRepository.saveAll(affected);
        }
        return response(saved);
    }

    public void applyDefaults(Asset asset) {
        policyRepository.findFirstByAssetTypeIgnoreCaseAndActiveTrue(asset.getType())
            .ifPresent(policy -> apply(asset, policy, false));
    }

    private void apply(Asset asset, AssetPolicy policy, boolean overwrite) {
        if (overwrite || asset.getAccountingCategory() == null) asset.setAccountingCategory(policy.getAccountingCategory());
        if (overwrite || asset.getAccountingGroup() == null) asset.setAccountingGroup(policy.getAccountingGroup());
        if (overwrite || asset.getAccountingTreatment() == null) asset.setAccountingTreatment(policy.getAccountingTreatment());
        if (overwrite || asset.getUsefulLifeMonths() == null) asset.setUsefulLifeMonths(policy.getUsefulLifeMonths());
        if (overwrite || asset.getUsefulLifeYears() == null) asset.setUsefulLifeYears((int) Math.ceil(policy.getUsefulLifeMonths() / 12.0));
        if (overwrite || asset.getDepreciationRate() == null) {
            asset.setDepreciationRate(BigDecimal.valueOf(1200)
                .divide(BigDecimal.valueOf(policy.getUsefulLifeMonths()), 2, RoundingMode.HALF_UP));
        }
        if (overwrite || asset.getDepreciationMethod() == null) asset.setDepreciationMethod(policy.getDepreciationMethod());
        if ((overwrite || asset.getResidualValue() == null) && asset.getAcquisitionValue() != null) {
            asset.setResidualValue(asset.getAcquisitionValue()
                .multiply(policy.getResidualRate())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        } else if (asset.getResidualValue() == null && policy.getResidualRate().signum() == 0) {
            asset.setResidualValue(BigDecimal.ZERO.setScale(2));
        }
        asset.setPolicyVersion(policy.getPolicyVersion());
        asset.setPolicyAppliedAt(LocalDateTime.now());
    }

    private AssetPolicyResponse response(AssetPolicy policy) {
        BigDecimal annualRate = BigDecimal.valueOf(1200)
            .divide(BigDecimal.valueOf(policy.getUsefulLifeMonths()), 2, RoundingMode.HALF_UP);
        return new AssetPolicyResponse(policy.getId(), policy.getAssetType(), policy.getAccountingCategory(),
            policy.getAccountingGroup(), policy.getAccountingTreatment(), policy.getUsefulLifeMonths(), annualRate,
            policy.getResidualRate(), policy.getDepreciationMethod(), policy.getPolicyVersion(), policy.isActive(),
            policy.getUpdatedAt());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
