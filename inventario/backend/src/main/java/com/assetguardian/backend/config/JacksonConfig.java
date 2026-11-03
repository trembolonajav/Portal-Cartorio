package com.assetguardian.backend.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    /**
     * Envia as datas com o sufixo Z. Sem ele, o navegador le o horario UTC como
     * se fosse local e mostra tudo 3 horas adiantado.
     */
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer utcLocalDateTimeSerializer() {
        return builder -> builder.serializerByType(LocalDateTime.class, new JsonSerializer<LocalDateTime>() {
            @Override
            public void serialize(LocalDateTime value, JsonGenerator generator, SerializerProvider serializers) throws IOException {
                generator.writeString(value.truncatedTo(ChronoUnit.MILLIS).toInstant(ZoneOffset.UTC).toString());
            }
        });
    }
}
