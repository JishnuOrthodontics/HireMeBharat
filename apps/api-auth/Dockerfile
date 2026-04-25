# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Accept build arguments
ARG SERVICE_NAME
ARG SERVICE_PATH

# Copy root package files
COPY package*.json ./

# Copy local dependencies
COPY packages/ ./packages/

# Copy service files
COPY ${SERVICE_PATH}/package*.json ./${SERVICE_PATH}/
COPY ${SERVICE_PATH}/tsconfig.json ./${SERVICE_PATH}/

# Install dependencies using workspaces
RUN npm install --workspace=@hiremebharat/${SERVICE_NAME}

# Build local dependencies
RUN npm run build --workspace=@hiremebharat/backend-core

# Copy service source
COPY ${SERVICE_PATH}/src ./${SERVICE_PATH}/src

# Build the service
WORKDIR /app/${SERVICE_PATH}
RUN npm run build

# Port
EXPOSE 3002

# Run
CMD ["npm", "start"]