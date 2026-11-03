package com.assetguardian.backend.config;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Convencao de datas do inventario: os LocalDateTime sao gravados em UTC e so
 * viram horario de Brasilia ao sair para um documento ou para a API.
 */
public final class BusinessTime {

    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private BusinessTime() {
    }

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDateTime toBusiness(LocalDateTime utc) {
        return utc == null ? null : utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(ZONE).toLocalDateTime();
    }

    public static LocalDateTime startOfDayUtc(LocalDate businessDay) {
        return toUtc(businessDay.atStartOfDay());
    }

    public static LocalDateTime endOfDayUtc(LocalDate businessDay) {
        return toUtc(businessDay.atTime(LocalTime.MAX));
    }

    private static LocalDateTime toUtc(LocalDateTime business) {
        return business.atZone(ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }
}
