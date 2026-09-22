FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
# Build-time placeholders only; runtime credentials must be supplied separately.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_URL=https://build.example.invalid \
    BETTER_AUTH_SECRET=build-only-placeholder-not-a-runtime-secret \
    npm run build

EXPOSE 3000
CMD ["npm", "start"]
