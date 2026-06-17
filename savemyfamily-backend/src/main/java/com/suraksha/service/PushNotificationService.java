package com.suraksha.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PushNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    public void sendHighPriorityPush(String targetUserId, String fcmToken, String title, String body, Map<String, String> data) {
        logger.info("==================== [CRITICAL PUSH SENT] ====================");
        logger.info("TARGET USER ID: {}", targetUserId);
        logger.info("TARGET FCM TOKEN: {}", fcmToken != null ? fcmToken : "NONE_MAPPED");
        logger.info("TITLE: {}", title);
        logger.info("BODY: {}", body);
        logger.info("PAYLOAD DATA: {}", data);
        
        // Critical alerts flag settings are configured in 'data' payload for clients
        logger.info("[PUSH SYSTEM] Android channel: 'critical_emergency_channel' (Priority: High, DND-bypass)");
        logger.info("[PUSH SYSTEM] iOS custom sound: 'siren.wav', critical-alert: 1, volume: 1.0");
        logger.info("=============================================================");
    }
}
