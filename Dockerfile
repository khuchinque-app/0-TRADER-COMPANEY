FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .

FROM base AS builder
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/apps /app/apps
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/node_modules /app/node_modules
COPY package*.json ./
EXPOSE 3000 3001
CMD ["npm", "run", "dev"]