FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 5173

CMD ["node", "server.mjs"]
