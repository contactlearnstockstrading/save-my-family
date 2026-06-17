package com.suraksha.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "emergency_sessions")
public class EmergencySession {
    @Id
    private String id;
    private String victimId;
    private String victimName;
    private String victimPhone;
    private GeoJsonPoint startLocation;
    private GeoJsonPoint currentLocation;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();
    private List<String> responderIds = new ArrayList<>();

    public EmergencySession() {}

    public EmergencySession(String victimId, String victimName, String victimPhone, GeoJsonPoint startLocation) {
        this.victimId = victimId;
        this.victimName = victimName;
        this.victimPhone = victimPhone;
        this.startLocation = startLocation;
        this.currentLocation = startLocation;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVictimId() { return victimId; }
    public void setVictimId(String victimId) { this.victimId = victimId; }

    public String getVictimName() { return victimName; }
    public void setVictimName(String victimName) { this.victimName = victimName; }

    public String getVictimPhone() { return victimPhone; }
    public void setVictimPhone(String victimPhone) { this.victimPhone = victimPhone; }

    public GeoJsonPoint getStartLocation() { return startLocation; }
    public void setStartLocation(GeoJsonPoint startLocation) { this.startLocation = startLocation; }

    public GeoJsonPoint getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(GeoJsonPoint currentLocation) { this.currentLocation = currentLocation; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<String> getResponderIds() { return responderIds; }
    public void setResponderIds(List<String> responderIds) { this.responderIds = responderIds; }
}
