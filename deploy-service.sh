#!/bin/bash

SERVICE_NAME=$1
IMAGE_TAG=$2

# Registry configuration
REGISTRY="localhost:5000"
IMAGE_NAME="hiremebharat-${SERVICE_NAME}"

echo "Deploying service: $SERVICE_NAME with tag: $IMAGE_TAG"

# Pull the new image
docker pull ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

# Update docker-compose to use the new image
cd /opt/hiremebharat
sed -i "s|image: .*hiremebharat-${SERVICE_NAME}:.*|image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}|g" docker-compose.prod.yml

# Restart only the specific service
docker compose -f docker-compose.prod.yml up -d $SERVICE_NAME

echo "Deployment of $SERVICE_NAME completed"