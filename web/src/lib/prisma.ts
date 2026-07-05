import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  prismaSchemaRevision?: number
}

// Bump when Prisma schema changes so dev hot-reload picks up new fields.
const PRISMA_SCHEMA_REVISION = 3

function createPrismaClient() {
  return new PrismaClient({ adapter })
}

function getPrismaClient() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaRevision === PRISMA_SCHEMA_REVISION
  ) {
    return globalForPrisma.prisma
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
    globalForPrisma.prismaSchemaRevision = PRISMA_SCHEMA_REVISION
  }
  return client
}

export const prisma = getPrismaClient()
