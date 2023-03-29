FROM node:18.12

WORKDIR /socket

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD [ "node", "index.js"]