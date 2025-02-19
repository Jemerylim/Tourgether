# Use Node.js to build the Vite frontend
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build

# Use Nginx to serve the frontend
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built frontend files to Nginx
COPY --from=build /app/dist . 

# Copy custom Nginx configuration into the correct folder
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose the port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

