import { NextResponse } from "next/server"

/** Blocca route di debug/sviluppo in produzione (404, non 403). */
export function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }
  return null
}
