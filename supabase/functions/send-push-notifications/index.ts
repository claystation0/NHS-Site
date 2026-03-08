import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string
  
  if (typeof data === 'string') {
    base64 = btoa(data)
  } else {
    const bytes = new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    base64 = btoa(binary)
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function generateVAPIDToken(vapidPublicKey: string, vapidPrivateKey: string, audience: string) {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
  }

  const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey)

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false,
    ['sign']
  )

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const encodedSignature = base64UrlEncode(signature)
  return `${unsignedToken}.${encodedSignature}`
}

// Web Push encryption implementation
async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveBits']
  )

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  const localPublicKey = new Uint8Array(localPublicKeyRaw)

  // Import user's public key
  const userPublicKeyBytes = urlBase64ToUint8Array(userPublicKey)
  const userPublicKeyCrypto = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    []
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: userPublicKeyCrypto
    },
    localKeyPair.privateKey,
    256
  )

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive encryption key and nonce
  const authBytes = urlBase64ToUint8Array(userAuth)
  
  // Create info for PRK
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: auth\0'),
  ])
  
  // Import auth secret as key
  const authSecretKey = await crypto.subtle.importKey(
    'raw',
    authBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Create PRK using HKDF-Extract (HMAC-based)
  const prkData = new Uint8Array([
    ...new Uint8Array(sharedSecret),
    ...authBytes
  ])
  
  const prk = await crypto.subtle.sign(
    'HMAC',
    authSecretKey,
    prkData
  )

  // Import PRK
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Derive key info
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aesgcm\0P-256\0'),
    ...new Uint8Array([0, 65]),
    ...userPublicKeyBytes,
    ...new Uint8Array([0, 65]),
    ...localPublicKey
  ])

  // Derive encryption key
  const keyHkdf = await crypto.subtle.sign('HMAC', prkKey, new Uint8Array([...salt, ...keyInfo, 1]))
  const contentEncryptionKey = new Uint8Array(keyHkdf).slice(0, 16)

  // Derive nonce
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: nonce\0P-256\0'),
    ...new Uint8Array([0, 65]),
    ...userPublicKeyBytes,
    ...new Uint8Array([0, 65]),
    ...localPublicKey
  ])

  const nonceHkdf = await crypto.subtle.sign('HMAC', prkKey, new Uint8Array([...salt, ...nonceInfo, 1]))
  const nonce = new Uint8Array(nonceHkdf).slice(0, 12)

  // Import content encryption key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    'AES-GCM',
    false,
    ['encrypt']
  )

  // Prepare payload with padding
  const paddingLength = 0 // No padding for simplicity
  const payloadBytes = new TextEncoder().encode(payload)
  const record = new Uint8Array(2 + paddingLength + payloadBytes.length)
  record[0] = (paddingLength >> 8) & 0xff
  record[1] = paddingLength & 0xff
  record.set(payloadBytes, 2 + paddingLength)

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      tagLength: 128
    },
    aesKey,
    record
  )

  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    publicKey: localPublicKey
  }
}

async function sendWebPushNotification(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  const endpoint = subscription.endpoint
  const audience = new URL(endpoint).origin

  // Encrypt the payload
  const { ciphertext, salt, publicKey } = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  )

  const vapidToken = await generateVAPIDToken(vapidPublicKey, vapidPrivateKey, audience)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${base64UrlEncode(salt)}`,
      'Crypto-Key': `dh=${base64UrlEncode(publicKey)};p256ecdsa=${vapidPublicKey}`,
      'Authorization': `WebPush ${vapidToken}`,
      'TTL': '86400'
    },
    body: ciphertext
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`Push failed: ${response.status} ${response.statusText} - ${responseText}`)
  }

  return response
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    console.log('=== Sending push notifications ===')

    // Verify the request has an authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated by checking their session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    console.log(`Authenticated user: ${user.id}`)

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys missing')
      return new Response(
        JSON.stringify({ error: 'VAPID configuration missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    const { targets } = await req.json()

    if (!targets || !Array.isArray(targets)) {
      return new Response(
        JSON.stringify({ error: 'Invalid targets array' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`Processing ${targets.length} targets`)

    const results = []

    for (const target of targets) {
      try {
        const { userId, title, body, data } = target
        console.log(`Sending to user: ${userId}`)

        const { data: subData, error: subError } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', userId)
          .single()

        if (subError || !subData) {
          console.log(`No subscription for ${userId}`)
          results.push({ userId, success: false, reason: 'No subscription' })
          continue
        }

        const payload = JSON.stringify({
          title,
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: data || {}
        })

        await sendWebPushNotification(
          subData.subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )

        console.log(`✓ Sent to ${userId}`)
        results.push({ userId, success: true })

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`✗ Error for ${target.userId}:`, msg)
        results.push({ 
          userId: target.userId, 
          success: false, 
          reason: msg
        })

        if (msg.includes('410') || msg.includes('404')) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', target.userId)
        }
      }
    }

    console.log(`=== DONE: ${results.filter(r => r.success).length}/${results.length} ===`)

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        total: targets.length,
        sent: results.filter(r => r.success).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('=== ERROR ===', msg)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: msg
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})