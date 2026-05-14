import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

export async function GET() {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const agent = await prisma.user.findFirst({
      where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent DIBENEDETTO not found' }, { status: 404 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: agent.id }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No push subscriptions found for DIBENEDETTO' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: 'SENTINEL TEST PUSH',
      body: 'Questa è una notifica di test dal server Oracle. Se la vedi, il sistema push è attivo!',
      icon: '/icons/icon-192x192.png',
      data: { url: '/' }
    })

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) => 
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          },
          payload
        )
      )
    )

    return NextResponse.json({
      message: `Tentativo inviato a ${subscriptions.length} dispositivi`,
      results
    })

  } catch (error: any) {
    console.error('Push test error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
