package com.suraksha.service;

import com.suraksha.model.*;
import com.suraksha.repository.EmergencySessionRepository;
import com.suraksha.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SOSService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmergencySessionRepository sessionRepository;

    @Autowired
    private SMSService smsService;

    @Autowired
    private PushNotificationService pushService;

    private static final double MAX_SEARCH_RADIUS_METERS = 5000.0; // 5 kilometers

    public EmergencySession startSOS(String victimId, double longitude, double latitude) {
        // Find victim user details
        User victim = userRepository.findById(victimId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + victimId));

        GeoJsonPoint startingPoint = new GeoJsonPoint(longitude, latitude);
        
        // Update victim's current database location coordinates
        victim.setLocation(startingPoint);
        userRepository.save(victim);

        // Check if there's already an active session for this victim to prevent duplicates
        Optional<EmergencySession> activeSessionOpt = sessionRepository.findByVictimIdAndActiveTrue(victimId);
        if (activeSessionOpt.isPresent()) {
            return activeSessionOpt.get();
        }

        // Create and save new emergency session
        EmergencySession session = new EmergencySession(
                victim.getId(),
                victim.getName(),
                victim.getPhoneNumber(),
                startingPoint
        );
        session = sessionRepository.save(session);

        // 1. Dispatch SMS alerts to trusted family contacts
        String liveTrackingUrl = "http://localhost:3000/track/" + session.getId();
        String alertMessage = String.format(
                "🚨 CRITICAL SAVEMYFAMILY ALERT! %s (%s) is in danger. Track their live GPS location immediately here: %s",
                victim.getName(), victim.getPhoneNumber(), liveTrackingUrl
        );
        
        for (EmergencyContact contact : victim.getTrustedContacts()) {
            smsService.sendSMS(contact.getPhoneNumber(), alertMessage);
        }

        // 2. Fetch the nearest volunteers (within 5km max)
        Point center = new Point(longitude, latitude);
        List<User> nearResponders = userRepository.findAvailableRespondersNear(center, MAX_SEARCH_RADIUS_METERS);

        // 3. Notify the closest 10 volunteers
        int notifyCount = 0;
        Map<String, String> dataPayload = new HashMap<>();
        dataPayload.put("type", "EMERGENCY_SOS");
        dataPayload.put("sessionId", session.getId());
        dataPayload.put("victimName", victim.getName());
        dataPayload.put("latitude", String.valueOf(latitude));
        dataPayload.put("longitude", String.valueOf(longitude));

        for (User responder : nearResponders) {
            if (responder.getId().equals(victimId)) continue; // Don't notify the victim themselves
            
            pushService.sendHighPriorityPush(
                    responder.getId(),
                    responder.getFcmToken(),
                    "🚨 CRITICAL SAFETY ALERT",
                    String.format("Someone is in danger near you! Tap to view live location and assist.", victim.getName()),
                    dataPayload
            );
            notifyCount++;
            if (notifyCount >= 10) break; // Maximum 10 responders
        }

        return session;
    }

    public EmergencySession updateLocation(String sessionId, double longitude, double latitude) {
        EmergencySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.isActive()) {
            throw new IllegalStateException("Cannot update location for an inactive emergency session.");
        }

        GeoJsonPoint updatedPoint = new GeoJsonPoint(longitude, latitude);
        session.setCurrentLocation(updatedPoint);
        
        // Also update the victim's location in the User collection
        userRepository.findById(session.getVictimId()).ifPresent(user -> {
            user.setLocation(updatedPoint);
            userRepository.save(user);
        });

        return sessionRepository.save(session);
    }

    public EmergencySession acceptSOS(String sessionId, String volunteerId) {
        EmergencySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!session.isActive()) {
            throw new IllegalStateException("This emergency session has already ended.");
        }

        if (!session.getResponderIds().contains(volunteerId)) {
            session.getResponderIds().add(volunteerId);
            sessionRepository.save(session);
        }

        return session;
    }

    public EmergencySession endSOS(String sessionId) {
        EmergencySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        session.setActive(false);
        return sessionRepository.save(session);
    }
}
