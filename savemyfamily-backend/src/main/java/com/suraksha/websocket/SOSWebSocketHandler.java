package com.suraksha.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class SOSWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(SOSWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map of sessionId -> Set of active WebSocket sessions participating
    private final Map<String, Set<WebSocketSession>> sessionGroups = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = getQueryParam(session.getUri(), "sessionId");
        if (sessionId == null || sessionId.isEmpty()) {
            session.close(CloseStatus.BAD_DATA);
            logger.warn("WebSocket closed: Missing sessionId in query parameters.");
            return;
        }

        sessionGroups.computeIfAbsent(sessionId, k -> Collections.synchronizedSet(new HashSet<>())).add(session);
        // Store the sessionId directly in session attributes for quick access on closing
        session.getAttributes().put("sessionId", sessionId);

        logger.info("New WebSocket connection established for SOS Session: {}", sessionId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = (String) session.getAttributes().get("sessionId");
        if (sessionId == null) return;

        String payload = message.getPayload();
        logger.debug("Received WebSocket payload on session {}: {}", sessionId, payload);

        // Parse message and broadcast it to all other sessions in the same group
        Set<WebSocketSession> clients = sessionGroups.get(sessionId);
        if (clients != null) {
            synchronized (clients) {
                for (WebSocketSession client : clients) {
                    if (client.isOpen() && !client.getId().equals(session.getId())) {
                        try {
                            client.sendMessage(new TextMessage(payload));
                        } catch (IOException e) {
                            logger.error("Error sending WebSocket message to client: {}", client.getId(), e);
                        }
                    }
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = (String) session.getAttributes().get("sessionId");
        if (sessionId != null) {
            Set<WebSocketSession> clients = sessionGroups.get(sessionId);
            if (clients != null) {
                clients.remove(session);
                if (clients.isEmpty()) {
                    sessionGroups.remove(sessionId);
                }
            }
            logger.info("WebSocket connection closed for SOS Session: {}", sessionId);
        }
    }

    private String getQueryParam(URI uri, String paramName) {
        if (uri == null || uri.getQuery() == null) return null;
        String query = uri.getQuery();
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            String[] idx = pair.split("=");
            if (idx.length == 2 && idx[0].equals(paramName)) {
                return idx[1];
            }
        }
        return null;
    }
}
