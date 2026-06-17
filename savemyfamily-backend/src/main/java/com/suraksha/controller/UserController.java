package com.suraksha.controller;

import com.suraksha.model.EmergencyContact;
import com.suraksha.model.User;
import com.suraksha.model.Role;
import com.suraksha.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody User user) {
        if (user.getId() == null || user.getId().isEmpty()) {
            user.setId(java.util.UUID.randomUUID().toString());
        }
        Optional<User> existing = userRepository.findByPhoneNumber(user.getPhoneNumber());
        if (existing.isPresent()) {
            // Update instead of failing, to make client testing smooth
            User dbUser = existing.get();
            dbUser.setName(user.getName());
            dbUser.setRole(user.getRole());
            if (user.getFcmToken() != null) dbUser.setFcmToken(user.getFcmToken());
            return ResponseEntity.ok(userRepository.save(dbUser));
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserProfile(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<User> updateLocation(
            @PathVariable String id,
            @RequestParam double longitude,
            @RequestParam double latitude) {
        
        return userRepository.findById(id).map(user -> {
            user.setLocation(new GeoJsonPoint(longitude, latitude));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/fcm")
    public ResponseEntity<User> updateFcmToken(
            @PathVariable String id,
            @RequestParam String fcmToken) {
        
        return userRepository.findById(id).map(user -> {
            user.setFcmToken(fcmToken);
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/volunteer-status")
    public ResponseEntity<User> toggleVolunteerStatus(
            @PathVariable String id,
            @RequestParam boolean isAvailable,
            @RequestParam Role role) {
        
        return userRepository.findById(id).map(user -> {
            user.setAvailable(isAvailable);
            user.setRole(role);
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/contacts")
    public ResponseEntity<User> addTrustedContact(
            @PathVariable String id,
            @RequestBody EmergencyContact contact) {
        
        return userRepository.findById(id).map(user -> {
            user.getTrustedContacts().add(contact);
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/contacts")
    public ResponseEntity<User> removeTrustedContact(
            @PathVariable String id,
            @RequestParam String phoneNumber) {
        
        return userRepository.findById(id).map(user -> {
            user.getTrustedContacts().removeIf(c -> c.getPhoneNumber().equals(phoneNumber));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }
}
