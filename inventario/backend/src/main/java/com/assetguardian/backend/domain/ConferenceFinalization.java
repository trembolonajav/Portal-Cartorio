package com.assetguardian.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "conference_finalizations", schema = "inventory")
public class ConferenceFinalization extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;
    @Column(name = "checked_by", nullable = false, length = 160)
    private String checkedBy;
    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;
}
