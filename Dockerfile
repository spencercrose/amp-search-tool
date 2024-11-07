# Use an official Node.js runtime as a parent image
FROM node:alpine

# Set the working directory in the container
WORKDIR /usr/app

# Copy the current directory contents into the container at /usr/app
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of the code into the container
COPY . .

# Make port 4000 available to the world outside this container
EXPOSE 4000

# Define environment variable
ENV NODE_ENV production

# Run app.js when the container launches
CMD ["npm", "run", "start"]