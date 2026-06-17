#!/bin/bash

# --- Antigravity Platform Unified Local Runner ---
# This script spins up the Docker containers, waits for health checks, 
# launches the Spring Boot Maven backend, and triggers the Next.js dev server.
# It includes a resilient database fallback to spin up the frontend anyway!
#
# Usage: ./start.sh

# Colors for premium visual output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${PURPLE}======================================================================${NC}"
echo -e "${PURPLE}         ⚡ ANTIGRAVITY SOFTWARE ENGINEERING PREP PLATFORM ⚡        ${NC}"
echo -e "${PURPLE}======================================================================${NC}"

# Define process tracking variables to kill on exit
BACKEND_PID=""
FRONTEND_PID=""

# Intercept Ctrl+C (SIGINT) to cleanly stop all running processes
cleanup() {
    echo -e "\n${YELLOW}>>> Intercepted shutdown signal. Cleaning up workspaces...${NC}"
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${BLUE}Stopping Next.js Frontend (PID: $FRONTEND_PID)...${NC}"
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${BLUE}Stopping Spring Boot Backend (PID: $BACKEND_PID)...${NC}"
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    
    # Only spin down compose if docker command exists
    if command -v docker &>/dev/null; then
        echo -e "${RED}Spinning down Docker containers...${NC}"
        docker compose -f interview-prep-backend/docker-compose.yml down 2>/dev/null || docker-compose -f interview-prep-backend/docker-compose.yml down 2>/dev/null
    fi
    
    echo -e "${GREEN}✓ Platform stopped cleanly. Have a great day!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

DOCKER_AVAILABLE=true
command -v docker &>/dev/null || DOCKER_AVAILABLE=false

# 1. Start Docker Containers
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${BLUE}Step 1: Starting Database Containers (MongoDB, Redis, Elasticsearch)...${NC}"
    docker compose -f interview-prep-backend/docker-compose.yml up -d 2>/dev/null || docker-compose -f interview-prep-backend/docker-compose.yml up -d 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # 2. Wait for MongoDB to become healthy
        echo -e "${YELLOW}Step 2: Checking MongoDB health status...${NC}"
        RETRIES=5
        MONGO_HEALTHY=false
        while [ $RETRIES -gt 0 ]; do
            docker exec academy_mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ MongoDB is healthy and ready!${NC}"
                MONGO_HEALTHY=true
                break
            fi
            echo -e "${YELLOW}Waiting for MongoDB to initialize... ($RETRIES retries left)${NC}"
            sleep 3
            RETRIES=$((RETRIES-1))
        done
        
        if [ "$MONGO_HEALTHY" = true ]; then
            # 3. Launch Spring Boot Backend
            echo -e "${BLUE}Step 3: Launching Spring Boot Maven Backend...${NC}"
            mvn -f interview-prep-backend/pom.xml spring-boot:run > backend.log 2>&1 &
            BACKEND_PID=$!
            echo -e "${GREEN}✓ Spring Boot launched in background (PID: $BACKEND_PID, logs: backend.log)${NC}"
        else
            echo -e "${RED}⚠️ Warning: MongoDB failed to respond. Skipping persistent backend startup...${NC}"
        fi
    else
        echo -e "${RED}⚠️ Warning: Failed to spin up docker compose containers. Skipping backend startup...${NC}"
    fi
else
    echo -e "${RED}⚠️ Warning: Docker command not found on your system!${NC}"
    echo -e "${YELLOW}To run the complete persistent backend, please install and launch Docker Desktop.${NC}"
    echo -e "${GREEN}🚀 Refactoring: Spinning up the Next.js 15 Frontend Dev Server so you can explore the UI!${NC}"
fi

# 4. Launch Next.js Frontend
echo -e "${BLUE}Step 4: Launching Next.js 15 Frontend Dev Server...${NC}"

# Ensure packages are up-to-date (with peer dependency bypass)
if [ ! -d "interview-prep-frontend/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing frontend dependencies...${NC}"
    npm --prefix interview-prep-frontend install --legacy-peer-deps
fi

echo -e "${YELLOW}Starting Next.js dev server...${NC}"
npm --prefix interview-prep-frontend run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend launched in background (PID: $FRONTEND_PID)${NC}"

echo -e "${PURPLE}======================================================================${NC}"
echo -e "${GREEN}🚀 PLATFORM WORKSPACE BOOTSTRAPPED SUCCESS!${NC}"
echo -e "${BLUE}💻 Next.js Client:   ${WHITE}http://localhost:3000${NC}"
if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${BLUE}⚡ Spring Boot APIs: ${WHITE}http://localhost:8080${NC}"
fi
echo -e "${YELLOW}Press [Ctrl + C] at any time to cleanly stop all running servers.${NC}"
echo -e "${PURPLE}======================================================================${NC}"

# Block script so that it stays open and handles traps
while true; do
    sleep 1
done
