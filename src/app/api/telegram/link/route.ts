import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Generate a 6 digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramLinkCode: code,
        telegramLinkExpires: expiresAt
      }
    });

    return NextResponse.json({ code });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate link code" }, { status: 500 });
  }
}
