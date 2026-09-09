package com.assetguardian.backend.domain;

public enum DivergenceType {
    WRONG_LOCATION,     // Local diferente
    WRONG_OWNER,        // Responsável diferente
    WRONG_DESCRIPTION,  // Descrição incorreta
    NO_TAG,             // Sem etiqueta
    DAMAGED,            // Danificado
    DISPOSED_FOUND,     // Baixado mas encontrado
    NEW_UNREGISTERED    // Novo / não cadastrado
}
