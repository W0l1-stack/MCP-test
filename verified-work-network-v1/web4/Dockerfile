FROM node:22-alpine AS base
WORKDIR /app

# Railway service variables must be declared as build arguments for Docker builds.
# These NEXT_PUBLIC_* values are intentionally client-visible and are baked into
# the Next.js browser bundle during `npm run build`.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

COPY parts /tmp/parts
RUN cat /tmp/parts/part-* > /tmp/bundle.b64 \
 && node -e "const fs=require('fs');fs.writeFileSync('/tmp/bundle.tar.gz',Buffer.from(fs.readFileSync('/tmp/bundle.b64','utf8').trim(),'base64'))" \
 && tar -xzf /tmp/bundle.tar.gz -C /app \
 && rm -rf /tmp/bundle.b64 /tmp/bundle.tar.gz /tmp/parts
RUN npm install
RUN test -n "$NEXT_PUBLIC_API_URL" \
 && test -n "$NEXT_PUBLIC_SUPABASE_URL" \
 && test -n "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
 && npm run build \
 && grep -R -F "$NEXT_PUBLIC_API_URL" /app/.next >/dev/null \
 && grep -R -F "$NEXT_PUBLIC_SUPABASE_URL" /app/.next >/dev/null
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh","-lc","npm start -- -p ${PORT:-3000}"]
