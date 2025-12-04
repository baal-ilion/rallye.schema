# Base image (compatible with Angular 18 toolchain)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system deps (chromium for tests if needed)
RUN apt-get update && \
    apt-get install -y chromium && \
    rm -rf /var/lib/apt/lists/*

# Add `/app/node_modules/.bin` to $PATH
ENV PATH=/app/node_modules/.bin:$PATH

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy app sources
COPY . .

# Expose dev server port
EXPOSE 4200

# Start dev server
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4200"]
