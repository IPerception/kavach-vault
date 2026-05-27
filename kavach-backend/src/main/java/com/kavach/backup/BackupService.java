package com.kavach.backup;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final Path dataDir;
    private final Path destFile;

    public BackupService() {
        String dir = System.getProperty("kavach.data.dir",
                System.getProperty("user.home") + "/.kavach");
        this.dataDir = Path.of(dir);
        this.destFile = dataDir.resolve("backup-destination.txt");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runStartupBackup() {
        if (!Files.exists(destFile)) {
            return;
        }
        try {
            String dest = Files.readString(destFile).strip();
            if (!dest.isBlank()) {
                copyDb(Path.of(dest));
            }
        } catch (IOException e) {
            log.warn("Startup backup skipped: {}", e.getMessage());
        }
    }

    public String getDestination() throws IOException {
        if (!Files.exists(destFile)) {
            return null;
        }
        String value = Files.readString(destFile).strip();
        return value.isBlank() ? null : value;
    }

    public void setDestination(String destination) throws IOException {
        if (destination == null || destination.isBlank()) {
            Files.deleteIfExists(destFile);
            return;
        }
        Path dest = Path.of(destination);
        if (!Files.isDirectory(dest)) {
            throw new IllegalArgumentException("Destination must be an existing directory: " + destination);
        }
        Files.writeString(destFile, destination);
    }

    public void clearDestination() throws IOException {
        Files.deleteIfExists(destFile);
    }

    public String runNow() throws IOException {
        String dest = getDestination();
        if (dest == null) {
            throw new IllegalStateException("No backup destination configured.");
        }
        Path destPath = Path.of(dest);
        String filename = copyDb(destPath);
        return destPath.resolve(filename).toString();
    }

    private String copyDb(Path destDir) throws IOException {
        if (!Files.isDirectory(destDir)) {
            throw new IllegalArgumentException("Backup destination is not a directory: " + destDir);
        }
        Path dbFile = dataDir.resolve("kavach.db");
        if (!Files.exists(dbFile)) {
            throw new IllegalStateException("Database file not found: " + dbFile);
        }
        String filename = "kavach-backup-" + LocalDateTime.now().format(TIMESTAMP) + ".db";
        Files.copy(dbFile, destDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        log.info("Backup written to {}/{}", destDir, filename);
        return filename;
    }
}
