import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sentinel Security Suite',
    short_name: 'Sentinel',
    description: 'La Sala Operativa Digitale per la Polizia Locale',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: '🆘 SOS GPS',
        short_name: 'SOS',
        url: '/?action=sos',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: '⏱️ Timbra Entrata',
        short_name: 'Timbra',
        url: '/?action=clockin',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: '📅 I miei Turni',
        short_name: 'Turni',
        url: '/?action=planning',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ]
  }
}
