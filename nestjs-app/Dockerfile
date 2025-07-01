# Build para modo dev
FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# Dependencias de produccion
FROM base AS prod_deps
RUN npm ci --omit=dev

# Dependencias de desarrollo
FROM base AS dev_deps 
RUN npm ci 

# Build 
FROM dev_deps AS builder 
COPY . .
RUN npm run build

# Runtime produccion
FROM node:18-alpine AS production_runtime
WORKDIR /usr/src/app
COPY --from=prod_deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY package.json . 
EXPOSE 3000 
CMD ["node", "dist/main"]

# Runtime desarrollo
FROM dev_deps AS development_runtime 
WORKDIR /usr/src/app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]