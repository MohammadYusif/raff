// src/app/api/admin/create-admin-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

/**
 * ONE-TIME endpoint to create the initial admin user
 * Should be removed or protected after first use
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in non-production for safety, or with a secret key
    const { secret, email, password, name } = await request.json();

    // Require a secret key to prevent abuse
    const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET;
    if (!ADMIN_CREATION_SECRET || secret !== ADMIN_CREATION_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid secret" },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user to ADMIN role
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
      });

      return NextResponse.json({
        success: true,
        message: "Existing user updated to ADMIN role",
        user: {
          email: existingUser.email,
          name: existingUser.name,
          role: "ADMIN",
        },
      });
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      warning: "⚠️  IMPORTANT: Change the password after first login!",
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
