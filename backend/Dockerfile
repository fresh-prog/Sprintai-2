FROM node:20-alpine

WORKDIR /app

# Install deps first for layer caching
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

# Generate Prisma client at build time when schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

ENV NODE_ENV=development
EXPOSE 4000

CMD ["npm", "run", "dev"]
