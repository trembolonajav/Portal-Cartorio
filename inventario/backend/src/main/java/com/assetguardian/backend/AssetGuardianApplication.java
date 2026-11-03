package com.assetguardian.backend;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AssetGuardianApplication {

    public static void main(String[] args) {
        // As datas sao gravadas em UTC; ver BusinessTime.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(AssetGuardianApplication.class, args);
    }
}
