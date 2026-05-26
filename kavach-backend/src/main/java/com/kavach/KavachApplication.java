package com.kavach;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class KavachApplication {

    public static void main(String[] args) throws Exception {
        String dataDir = System.getProperty("kavach.data.dir",
                Paths.get(System.getProperty("user.home"), ".kavach").toString());
        Files.createDirectories(Path.of(dataDir));
        System.setProperty("spring.datasource.url", "jdbc:sqlite:" + dataDir + "/kavach.db");
        SpringApplication.run(KavachApplication.class, args);
    }
}
