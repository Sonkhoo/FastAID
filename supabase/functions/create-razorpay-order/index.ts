// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, receipt, partial_payment, notes } = await req.json()
    console.log('Received request:', { amount, currency, receipt, partial_payment, notes })

    // Validate required fields
    if (!amount || !currency) {
      throw new Error('Amount and currency are required')
    }

    // Get Razorpay credentials from environment
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    console.log('Environment check:', { 
      keyId: keyId ? 'Set' : 'Not set', 
      keySecret: keySecret ? 'Set' : 'Not set' 
    })

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase environment variables.')
    }

    // Create order payload
    const orderPayload = {
      amount,
      currency,
      receipt,
      partial_payment: partial_payment || false,
      notes: notes || {}
    }

    console.log('Making request to Razorpay with payload:', orderPayload)

    // Make request to Razorpay API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`
      },
      body: JSON.stringify(orderPayload)
    })

    console.log('Razorpay response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Razorpay API error response:', errorData)
      throw new Error(`Razorpay API error: ${response.status} - ${errorData}`)
    }

    const orderData = await response.json()
    console.log('Razorpay order created successfully:', orderData)

    return new Response(
      JSON.stringify(orderData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    console.error('Error creating Razorpay order:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 