package com.suraksha.service;

import com.suraksha.model.*;
import com.suraksha.repository.EmergencySessionRepository;
import com.suraksha.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class SOSServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmergencySessionRepository sessionRepository;

    @Mock
    private SMSService smsService;

    @Mock
    private PushNotificationService pushService;

    @InjectMocks
    private SOSService sosService;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testStartSOS_TriggersSmsAndQueriesNearestVolunteers() {
        // Mock Victim User
        String victimId = "victim1";
        User victim = new User(victimId, "Priya Sharma", "+919988776655", Role.USER);
        victim.getTrustedContacts().add(new EmergencyContact("Father", "+919111122222"));
        
        when(userRepository.findById(victimId)).thenReturn(Optional.of(victim));
        when(userRepository.save(any(User.class))).thenReturn(victim);

        // Mock Session Save
        EmergencySession session = new EmergencySession(victimId, "Priya Sharma", "+919988776655", new GeoJsonPoint(77.5946, 12.9716));
        session.setId("session1");
        when(sessionRepository.findByVictimIdAndActiveTrue(victimId)).thenReturn(Optional.empty());
        when(sessionRepository.save(any(EmergencySession.class))).thenReturn(session);

        // Mock 3 Responders in the DB (two nearby, one victim matching ignored)
        User vol1 = new User("vol1", "Helper A", "+918888888881", Role.VOLUNTEER);
        vol1.setFcmToken("tok1");
        User vol2 = new User("vol2", "Helper B", "+918888888882", Role.VOLUNTEER);
        vol2.setFcmToken("tok2");
        List<User> mockVolunteers = Arrays.asList(vol1, vol2, victim);
        
        when(userRepository.findAvailableRespondersNear(any(Point.class), anyDouble()))
                .thenReturn(mockVolunteers);

        // Trigger Service Method
        EmergencySession result = sosService.startSOS(victimId, 77.5946, 12.9716);

        // Assert and Verify
        assertNotNull(result);
        assertEquals("session1", result.getId());
        assertEquals("victim1", result.getVictimId());

        // Verify SMS sent to trusted family contacts
        verify(smsService, times(1)).sendSMS(eq("+919111122222"), anyString());

        // Verify FCM Push Alerts went out to responders (excluding the victim themselves)
        verify(pushService, times(1)).sendHighPriorityPush(eq("vol1"), eq("tok1"), anyString(), anyString(), anyMap());
        verify(pushService, times(1)).sendHighPriorityPush(eq("vol2"), eq("tok2"), anyString(), anyString(), anyMap());
        verify(pushService, never()).sendHighPriorityPush(eq(victimId), any(), anyString(), anyString(), anyMap());
    }
}
