# Use Node.js as base image
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Build the Vite project
RUN npm run build

# Use Nginx for serving the frontend
FROM nginx:alpine

# Copy built frontend files to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the default HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
