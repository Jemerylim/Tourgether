# Use the official Node.js image as the base for building the frontend
FROM node:16 as build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY . .

# Build the application for production
RUN npm run build

# Use an Nginx image to serve the production build
FROM nginx:alpine

# Copy the production build files from the build stage
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expose port 80 for serving the application
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
