export const metadata = {
  title: 'Background Remover',
  description: 'Remove backgrounds from images',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

import PHProvider from './ph-provider'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: #0b1021;
            min-height: 100vh;
            min-height: 100dvh;
          }
          
          @media (max-width: 768px) {
            .main-container {
              padding: 16px !important;
            }
            
            .card-container {
              padding: 20px !important;
            }
            
            .content-wrapper {
              gap: 16px !important;
            }
            
            .section {
              min-width: 100% !important;
            }
            
            button, input[type="file"] {
              min-height: 44px !important;
              font-size: 16px !important;
            }
            
            .preview-container {
              max-height: 400px !important;
              min-height: 300px !important;
            }
          }
          
          @media (max-width: 480px) {
            .main-container {
              padding: 12px !important;
            }
            
            .card-container {
              padding: 16px !important;
            }
            
            h1 {
              font-size: 24px !important;
            }
          }
        `}</style>
      </head>
      <body>
        <PHProvider>{children}</PHProvider>
        <Analytics />
        <a
          href="https://ko-fi.com/dksheaven"
          target="_blank"
          rel="noopener noreferrer"
          style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 50, padding: '10px 14px', background: '#1e2748', color: '#aab3c5', borderRadius: '999px', textDecoration: 'none', fontWeight: 700, border: '1px solid #33406b', boxShadow: '0 6px 18px rgba(0,0,0,.25)', opacity: 0.95 }}
        >
          ☕ Support on Ko‑fi
        </a>
      </body>
    </html>
  )
}

