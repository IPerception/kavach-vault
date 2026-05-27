package com.kavach.backup;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/settings/backup")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getDestination() throws IOException {
        String dest = backupService.getDestination();
        return ResponseEntity.ok(Map.of("destination", dest != null ? dest : ""));
    }

    @PutMapping
    public ResponseEntity<Void> setDestination(@RequestBody Map<String, String> body) throws IOException {
        String destination = body.get("destination");
        try {
            backupService.setDestination(destination);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearDestination() throws IOException {
        backupService.clearDestination();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/run")
    public ResponseEntity<Map<String, String>> runNow() throws IOException {
        try {
            String path = backupService.runNow();
            return ResponseEntity.ok(Map.of("path", path));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        }
    }
}
