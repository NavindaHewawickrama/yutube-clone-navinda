// This is the new Prisma 7 configuration file
// It replaces the datasource block that used to be in schema.prisma

import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,  // The ! tells TypeScript it exists
  },
});