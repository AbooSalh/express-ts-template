# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app


# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .


# Build TypeScript
RUN npm run build


# Expose the port from environment variable (default to 5000 if not set)
ARG PORT=5050
EXPOSE ${PORT}

# Start the app
CMD ["node", "dist/server.js"]
