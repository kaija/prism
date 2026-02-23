/**
 * System admin configuration.
 *
 * Reads the SYSTEM_ADMIN_EMAILS environment variable on every call so that
 * changes to the list take effect on the next sign-in without a restart
 * (Requirement 2.3).
 */

/**
 * Check whether the given email is in the system administrator list.
 *
 * The list is sourced from the `SYSTEM_ADMIN_EMAILS` env var, which holds a
 * comma-separated set of email addresses. Comparison is case-insensitive
 * (Requirement 2.2).
 *
 * @param email - The email address to check
 * @returns `true` when the email matches an entry in the admin list
 */
export function isSystemAdmin(email: string): boolean {
  const raw = process.env.SYSTEM_ADMIN_EMAILS ?? "";
  if (!raw.trim()) {
    return false;
  }

  const adminEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  return adminEmails.includes(email.toLowerCase());
}
