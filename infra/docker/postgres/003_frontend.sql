-- Frontend schema (NextAuth + RBAC tables)

CREATE TYPE "Role" AS ENUM ('viewer', 'editor', 'admin', 'owner');

CREATE TABLE IF NOT EXISTS "User" (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT,
    image           TEXT,
    "emailVerified" TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Account" (
    id                  TEXT PRIMARY KEY,
    "userId"            TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    provider            TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          INTEGER,
    token_type          TEXT,
    scope               TEXT,
    id_token            TEXT,
    UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "Session" (
    id              TEXT PRIMARY KEY,
    "sessionToken"  TEXT NOT NULL UNIQUE,
    "userId"        TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    expires         TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "Project" (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProjectMembership" (
    id          TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    role        "Role" NOT NULL DEFAULT 'viewer',
    UNIQUE("userId", "projectId")
);

CREATE TABLE IF NOT EXISTS "UserGroup" (
    id          TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    role        "Role" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("projectId", name)
);

CREATE TABLE IF NOT EXISTS "UserGroupMember" (
    id              TEXT PRIMARY KEY,
    "userGroupId"   TEXT NOT NULL REFERENCES "UserGroup"(id) ON DELETE CASCADE,
    "userId"        TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    UNIQUE("userGroupId", "userId")
);
