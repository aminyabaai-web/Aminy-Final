import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { items, successUrl, cancelUrl, userId } = await req.json();

        if (!items || items.length === 0) {
            throw new Error('Items array is required and cannot be empty.');
        }

        if (!userId) {
            throw new Error('User ID is required.');
        }

        // Format line items for Stripe
        const lineItems = items.map((item: any) => {
            // If product already has a Stripe Price ID, use it directly (Best practice for recurring or specific price rules)
            if (item.stripePriceId) {
                return {
                    price: item.stripePriceId,
                    quantity: item.quantity || 1,
                };
            }

            // Otherwise, construct price data dynamically (Good for flexible carts)
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                        metadata: {
                            productId: item.id
                        }
                    },
                    unit_amount: Math.round(item.price * 100), // Stripe expects cents
                },
                quantity: item.quantity || 1,
            };
        });

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment', // One-time physical/digital product purchase
            success_url: successUrl || `${req.headers.get('origin')}/store/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/store`,
            client_reference_id: userId,
            metadata: {
                order_type: 'store_purchase',
                user_id: userId
            }
        });

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (err: any) {
        console.error('Error creating Stripe checkout session:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
