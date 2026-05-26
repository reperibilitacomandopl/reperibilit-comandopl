import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"
import { decrypt } from "@/lib/crypto"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "L'indirizzo email è obbligatorio" }, { status: 400 })
    }

    // 1. Trova l'utente (case insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      }
    })

    if (!user) {
      // Non rivelare se l'email esiste o meno per sicurezza, restituisci comunque successo
      return NextResponse.json({ success: true })
    }

    // Se l'utente non ha un tenant associato, non possiamo usare la PEC configurata
    if (!user.tenantId) {
      console.warn(`[Forgot Password] Utente ${email} non ha un tenantId associato.`)
      // Non possiamo inviare la mail
      return NextResponse.json({ success: true })
    }

    // 2. Recupera le configurazioni PEC/SMTP del tenant o usa quelle di sistema
    const pecSettings = await prisma.pecSettings.findUnique({
      where: { tenantId: user.tenantId }
    })

    const smtpUser = pecSettings?.user || process.env.PEC_SMTP_USER
    const smtpPass = pecSettings?.pass ? decrypt(pecSettings.pass) : process.env.PEC_SMTP_PASS

    if (!smtpUser || !smtpPass) {
      console.warn(`[Forgot Password] Tenant ${user.tenantId} non ha credenziali email configurate e manca la config globale.`)
      return NextResponse.json({ success: true }) // Simula successo per sicurezza
    }

    // 3. Genera un token univoco e la scadenza (1 ora)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expires = new Date(Date.now() + 3600000) // +1 ora

    // Salva il token hashato sul database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires
      }
    })

    // 4. Configura il transporter
    const smtpHost = pecSettings?.host || process.env.PEC_SMTP_HOST || "smtps.pec.aruba.it"
    const smtpPort = pecSettings?.port ? Number(pecSettings.port) : (Number(process.env.PEC_SMTP_PORT) || 465)
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // 5. Costruisci il link e invia l'email
    // Utilizziamo l'host della richiesta per generare il link corretto
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const resetUrl = `${protocol}://${host}/reset-password?token=${rawToken}`

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #1e293b; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">PORTALE CASERMA</h1>
        </div>
        
        <div style="padding: 32px; background-color: #ffffff;">
          <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Richiesta Recupero Password</h2>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Ciao <strong>${user.name}</strong>,<br><br>
            Abbiamo ricevuto una richiesta per reimpostare la password del tuo account sul Portale Caserma. 
            Se sei stato tu a farne richiesta, clicca sul pulsante qui sotto per scegliere una nuova password.
          </p>
          
          <div style="text-align: center; margin: 36px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Reimposta Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
            Se non sei stato tu a richiedere il recupero, puoi ignorare in sicurezza questa email. 
            Il link scadrà tra 1 ora.
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Email generata automaticamente dal sistema.<br>Non rispondere a questo indirizzo.
          </p>
        </div>
      </div>
    `

    try {
      const fromAddress = pecSettings?.fromAddr || process.env.PEC_FROM || "comando@pec.it"
      await transporter.sendMail({
        from: fromAddress,
        to: user.email,
        subject: "Recupero Password - Portale Caserma",
        html: htmlBody,
      })
      console.log(`[Forgot Password] Email di reset inviata con successo a ${user.email}`)
    } catch (mailError) {
      console.error("[Forgot Password] Errore nell'invio dell'email:", mailError)
      // Se l'invio fallisce non blocchiamo l'utente ma registriamo l'errore
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Forgot Password API Error]", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
