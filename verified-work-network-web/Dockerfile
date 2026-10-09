FROM node:22-alpine AS source
WORKDIR /work
COPY parts /tmp/parts
RUN cat /tmp/parts/part-*.txt > /tmp/web_bundle.b64 \
    && node -e "const fs=require('fs'); fs.writeFileSync('/tmp/web.tar.gz', Buffer.from(fs.readFileSync('/tmp/web_bundle.b64','utf8').trim(),'base64'))" \
    && tar -xzf /tmp/web.tar.gz -C /work

FROM node:22-alpine AS deps
WORKDIR /app
COPY --from=source /work/package*.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=source /work/ ./
RUN mkdir -p public
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["sh","-lc","npm run start -- -p ${PORT:-3000}"]
