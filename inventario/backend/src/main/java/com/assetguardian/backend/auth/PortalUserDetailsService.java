package com.assetguardian.backend.auth;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PortalUserDetailsService implements UserDetailsService {

    private final PortalUserAccountRepository repository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        PortalUserAccount account = repository.findByUsernameIgnoreCase(username.trim())
            .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado"));

        Set<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();
        for (String role : account.getRoles()) {
            String normalized = role.toLowerCase(Locale.ROOT);
            if ("admin".equals(normalized)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            } else if ("operador".equals(normalized)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_OPERATOR"));
            } else if ("usuario".equals(normalized)) {
                // Estagiário: ver inventário + conferência física (mobile); nunca excluir.
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }
        }

        return new User(account.getUsername(), account.getPassword(), authorities);
    }
}
