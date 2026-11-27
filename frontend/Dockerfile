FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BACKEND_URL=http://platform:5000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]
