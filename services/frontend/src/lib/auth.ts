import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { isSystemAdmin } from "@/lib/system-admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      // Evaluate system admin status on every sign-in so env var changes
      // take effect without a restart (Requirement 2.3).
      const isSysAdmin = isSystemAdmin(user.email);

      if (!existingUser) {
        // New user — PrismaAdapter will create the User record.
        // Ensure a default ProjectMembership with Viewer role is NOT
        // created here; role assignment happens at project-invite time.
        // The User row itself is created by the adapter automatically.
        // System admin flag will be attached to the session in the
        // session callback after the user record exists.
        return true;
      }

      // Existing user — preserve the record as-is (Requirement 1.3).
      // System admin status is re-evaluated each sign-in via the env var.
      return true;
    },

    async session({ session, user }) {
      // Attach the database user ID to the session so downstream code
      // can look up memberships, roles, etc.
      session.user.id = user.id;

      // Evaluate system admin status from env var on every session
      // so changes apply without restart (Requirement 2.3).
      if (session.user.email) {
        (session.user as unknown as Record<string, unknown>).isSystemAdmin =
          isSystemAdmin(session.user.email);
      }

      return session;
    },
  },
});
