package com.assetguardian.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/me").authenticated()
                // Painel de auditoria da conferência: apenas administração.
                .requestMatchers(HttpMethod.GET, "/api/v1/conference/**").hasAnyRole("ADMIN", "OPERATOR")
                // Estagiário (USER) pode VER o inventário e usar a conferência física; nunca excluir/editar cadastro.
                .requestMatchers(HttpMethod.GET, "/api/v1/**").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.PUT, "/api/v1/asset-policies/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/asset-documents").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets/*/check").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.POST, "/api/v1/stations/*/finalize-conference").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.POST, "/api/v1/checks/*/photos").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.PUT, "/api/v1/assets/*").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets/*/void").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/asset-disposals/*/finalize").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets/*/link").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets/*/unlink").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/assets/*/transfer").hasAnyRole("ADMIN", "OPERATOR", "USER")
                .requestMatchers(HttpMethod.POST, "/api/v1/asset-disposals/**").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/responsibility-terms/**").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/equipment-exchange-terms/**").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/asset-requests/**").hasAnyRole("ADMIN", "OPERATOR")
                .requestMatchers(HttpMethod.POST, "/api/v1/departments").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/departments/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/departments/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/spaces").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/spaces/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/spaces/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/employees").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/employees/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/employees/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/stations").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/stations/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/stations/*/responsible").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/stations/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/layouts/*").hasRole("ADMIN")
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    @SuppressWarnings("deprecation")
    public PasswordEncoder passwordEncoder() {
        return NoOpPasswordEncoder.getInstance();
    }
}
