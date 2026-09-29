FROM node:20-alpine AS base
WORKDIR /workplace
COPY package*.json ./
RUN npm ci --include=dev
COPY . .

FROM base AS builder
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /workplace
COPY --from=builder /workplace/apps /workplace/apps
COPY --from=builder /workplace/packages /workplace/packages
COPY --from=builder /workplace/node_modules /workplace/node_modules
COPY package*.json ./
EXPOSE 3000 3001
CMD ["npm", "run", "dev"]