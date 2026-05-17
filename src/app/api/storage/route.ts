import { NextResponse } from "next/server"
import { verifySignedUrl, getAbsolutePath } from "@/lib/storage"
import { auth } from "@/auth"
import fs from "fs"
import path from "path"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token mancante" }, { status: 400 })
    }

    const payload = verifySignedUrl(token)
    if (!payload) {
      return NextResponse.json({ error: "Token non valido o scaduto" }, { status: 403 })
    }

    // Protezione directory traversal
    const absolutePath = getAbsolutePath(payload.path)
    const resolved = path.resolve(absolutePath)
    const storageRoot = path.resolve(getAbsolutePath(""))

    if (!resolved.startsWith(storageRoot)) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: "File non trovato" }, { status: 404 })
    }

    // Determina content type in base all'estensione
    const ext = path.extname(payload.path).toLowerCase()
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".txt": "text/plain",
      ".json": "application/json",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".csv": "text/csv"
    }
    const contentType = mimeTypes[ext] || "application/octet-stream"

    const fileBuffer = fs.readFileSync(resolved)
    const fileName = path.basename(payload.path)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=900" // 15 minuti
      }
    })
  } catch (error) {
    console.error("[STORAGE_ERROR]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
