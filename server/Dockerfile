ARG NODE_VERSION=18.4.0

FROM node:${NODE_VERSION}-alpine as build
WORKDIR /opt

COPY package.json package-lock.json tsconfig.json tsconfig.compile.json .barrelsby.json ./

RUN apk add g++ make py3-pip
RUN npm install

COPY . .

RUN npm run build

FROM node:${NODE_VERSION}-alpine as runtime
ENV WORKDIR /opt
WORKDIR $WORKDIR

RUN apk update && apk add build-base git curl
RUN npm install -g pm2

COPY --from=build /opt .

RUN yarn install --pure-lockfile --production

COPY processes.config.js .

EXPOSE 8081
ENV PORT 8081
ENV NODE_ENV production

CMD ["pm2-runtime", "start", "processes.config.js", "--env", "production"]
