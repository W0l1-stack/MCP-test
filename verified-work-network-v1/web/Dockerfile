FROM node:22-alpine AS base
WORKDIR /app
COPY parts /tmp/parts
RUN cat /tmp/parts/part-* > /tmp/bundle.b64 \
 && node -e "const fs=require('fs');fs.writeFileSync('/tmp/bundle.tar.gz',Buffer.from(fs.readFileSync('/tmp/bundle.b64','utf8').trim(),'base64'))" \
 && tar -xzf /tmp/bundle.tar.gz -C /app \
 && rm -rf /tmp/bundle.b64 /tmp/bundle.tar.gz /tmp/parts
RUN npm install
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh","-lc","npm start -- -p ${PORT:-3000}"]
