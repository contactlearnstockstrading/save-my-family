package com.suraksha.controller;

import com.suraksha.model.EmergencySession;
import com.suraksha.service.SOSService;
import com.suraksha.repository.EmergencySessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sos")
@CrossOrigin(origins = "*")
public class SOSController {

    @Autowired
    private SOSService sosService;

    @Autowired
    private EmergencySessionRepository sessionRepository;

    @PostMapping("/trigger")
    public ResponseEntity<EmergencySession> triggerSOS(
            @RequestParam String victimId,
            @RequestParam double longitude,
            @RequestParam double latitude) {
        try {
            EmergencySession session = sosService.startSOS(victimId, longitude, latitude);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{sessionId}/location")
    public ResponseEntity<EmergencySession> updateLiveLocation(
            @PathVariable String sessionId,
            @RequestParam double longitude,
            @RequestParam double latitude) {
        try {
            EmergencySession session = sosService.updateLocation(sessionId, longitude, latitude);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{sessionId}/accept")
    public ResponseEntity<EmergencySession> acceptSOS(
            @PathVariable String sessionId,
            @RequestParam String volunteerId) {
        try {
            EmergencySession session = sosService.acceptSOS(sessionId, volunteerId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<EmergencySession> endSOS(@PathVariable String sessionId) {
        try {
            EmergencySession session = sosService.endSOS(sessionId);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<EmergencySession> getSession(@PathVariable String sessionId) {
        return sessionRepository.findById(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
