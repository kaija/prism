"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/mail";

export type AuthActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function signUpAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
      emailVerified: null,
    },
  });

  // Generate verification token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  try {
    await sendVerificationEmail(email, token);
  } catch {
    // If SMTP is not configured, still create the account but warn
    return {
      success: true,
      message:
        "Account created. Email verification is not available — contact your admin to verify your account.",
    };
  }

  return {
    success: true,
    message: "Account created. Check your email to verify your account.",
  };
}

export async function verifyEmailAction(
  token: string,
  email: string,
): Promise<AuthActionResult> {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email.toLowerCase(), token },
  });

  if (!record) {
    return { success: false, error: "Invalid or expired verification link." };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token: record.token } },
    });
    return { success: false, error: "Verification link has expired. Please sign up again." };
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token: record.token } },
  });

  return { success: true, message: "Email verified. You can now sign in." };
}
