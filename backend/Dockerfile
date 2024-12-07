# Use the official Node.js image as a base
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY . .

# Expose the port your backend is running on (adjust if not 5000)
EXPOSE 5000

# Start the backend server
CMD ["npm", "start"]
