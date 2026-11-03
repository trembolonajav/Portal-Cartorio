package com.assetguardian.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;

@JsonTest
@Import(JacksonConfig.class)
class BusinessTimeTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void apiMarksStoredDatesAsUtc() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of("foundAt", LocalDateTime.of(2026, 11, 3, 22, 1, 31, 769876000)));

        assertThat(json).isEqualTo("{\"foundAt\":\"2026-11-03T22:01:31.769Z\"}");
    }

    @Test
    void apiKeepsCalendarDatesUnchanged() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of("issueDate", LocalDate.of(2026, 11, 3)));

        assertThat(json).isEqualTo("{\"issueDate\":\"2026-11-03\"}");
    }

    @Test
    void convertsStoredUtcToBrasilia() {
        assertThat(BusinessTime.toBusiness(LocalDateTime.of(2026, 11, 3, 22, 1)))
            .isEqualTo(LocalDateTime.of(2026, 11, 3, 19, 1));
        assertThat(BusinessTime.toBusiness(LocalDateTime.of(2026, 11, 4, 1, 0)).toLocalDate())
            .isEqualTo(LocalDate.of(2026, 11, 3));
        assertThat(BusinessTime.toBusiness(null)).isNull();
    }

    @Test
    void filterDaysFollowTheBrasiliaCalendar() {
        LocalDate day = LocalDate.of(2026, 11, 3);

        assertThat(BusinessTime.startOfDayUtc(day)).isEqualTo(LocalDateTime.of(2026, 11, 3, 3, 0));
        assertThat(BusinessTime.endOfDayUtc(day)).isAfter(LocalDateTime.of(2026, 11, 4, 2, 59, 59));
        assertThat(BusinessTime.endOfDayUtc(day)).isBefore(LocalDateTime.of(2026, 11, 4, 3, 0));
    }
}
