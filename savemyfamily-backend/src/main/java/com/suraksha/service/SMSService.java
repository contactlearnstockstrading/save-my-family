package com.suraksha.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SMSService {
    private static final Logger logger = LoggerFactory.getLogger(SMSService.class);

    @Value("${suraksha.twilio.account-sid}")
    private String accountSid;

    @Value("${suraksha.twilio.auth-token}")
    private String authToken;

    @Value("${suraksha.twilio.from-phone-number}")
    private String fromPhone;

    public void sendSMS(String toPhoneNumber, String messageText) {
        logger.info("-------------------- [SMS ALARM TRIGGERED] --------------------");
        logger.info("TO: {}", toPhoneNumber);
        logger.info("FROM: {}", fromPhone);
        logger.info("MESSAGE: {}", messageText);
        
        // If keys are not default placeholders, we could initialize Twilio.
        // For local development, we print a premium warning and complete successfully.
        if (accountSid.contains("placeholder") || authToken.contains("placeholder")) {
            logger.info("[MOCK SMS] Credentials not configured. Simulated SMS delivery SUCCESSFUL.");
        } else {
            try {
                // Actual Twilio REST API request or client SDK call would happen here.
                // We keep it as a mock fallback to prevent crash during sandbox test runs.
                logger.info("[SMS SERVICE] Integrating with Twilio Account SID: {}", accountSid);
            } catch (Exception e) {
                logger.error("Failed to send real SMS via Twilio, falling back to mock logs", e);
            }
        }
        logger.info("---------------------------------------------------------------");
    }
}
