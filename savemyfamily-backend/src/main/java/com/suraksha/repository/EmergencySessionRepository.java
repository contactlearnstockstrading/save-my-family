package com.suraksha.repository;

import com.suraksha.model.EmergencySession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencySessionRepository extends MongoRepository<EmergencySession, String> {
    List<EmergencySession> findByActiveTrue();
    Optional<EmergencySession> findByVictimIdAndActiveTrue(String victimId);
}
