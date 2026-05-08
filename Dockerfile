# # ============================================================
# #  COFAT WMS - Dockerfile Angular Frontend
# #  Build en 2 étapes : Node.js → Nginx static
# # ============================================================

# # ── Étape 1 : Build Angular ────────────────────────────────
# FROM node:20-alpine AS build

# WORKDIR /app

# # Copier package.json d'abord (cache npm optimisé)
# COPY package.json package-lock.json ./
# RUN npm ci --prefer-offline        # Installation propre et reproductible

# # Copier tout le code source Angular
# COPY . .

# # Build pour la production (optimisé, minifié)
# RUN npm run build -- --configuration=production
# # ── Étape 2 : Servir avec Nginx ────────────────────────────
# FROM nginx:1.25-alpine

# RUN rm /etc/nginx/conf.d/default.conf

# # ICI : Le chemin mis à jour selon ton angular.json
# COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_OPTIONS=--max_old_space_size=4096

RUN npm run build

RUN npm install -g serve

EXPOSE 4200

CMD ["serve", "-s", "dist/frontend/browser", "-l", "4200"]
