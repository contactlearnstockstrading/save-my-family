package com.suraksha.repository;

import com.suraksha.model.User;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByPhoneNumber(String phoneNumber);

    // Geospatial query to find nearby volunteers/both who are available
    @Query("{ 'role': { $in: ['VOLUNTEER', 'BOTH'] }, 'isAvailable': true, 'location': { $nearSphere: { $geometry: ?0, $maxDistance: ?1 } } }")
    List<User> findAvailableRespondersNear(Point location, double maxDistanceInMeters);
}
