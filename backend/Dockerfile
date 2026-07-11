FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY src ./src

VOLUME ["/app/data"]
EXPOSE 3001

CMD ["node", "src/server.js"]
