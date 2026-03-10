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
        const {
            priceId,
            items,
            successUrl,
            cancelUrl,
            userId,
            customerEmail,
            customer,
        } = await req.json();

        if (!userId) {
            throw new Error('User ID is required.');
        }

        // ---------------------------------------------------------------
        // Path A: Single price-based checkout (subscriptions & one-time)
        //   Used by PaywallSimplified / createCheckoutSession client call
        // ---------------------------------------------------------------
        if (priceId) {
            // Look up the price to determine if it's recurring
            const price = await stripe.prices.retrieve(priceId);
            const isRecurring = price.type === 'recurring';

            const sessionParams: Stripe.Checkout.SessionCreateParams = {
                // Do NOT restrict payment_method_types — let Stripe auto-enable
                // card, Apple Pay, Google Pay, and Link based on the customer's
                // device and your Stripe Dashboard payment-method settings.
                line_items: [{ price: priceId, quantity: 1 }],
                mode: isRecurring ? 'subscription' : 'payment',
                success_url:
                    successUrl ||
                    `${req.headers.get('origin')}/?screen=dashboard&payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url:
                    cancelUrl ||
                    `${req.headers.get('origin')}/?screen=paywall&payment=cancelled`,
                client_reference_id: userId,
                allow_promotion_codes: true,
                metadata: {
                    order_type: isRecurring ? 'subscription' : 'one_time',
                    user_id: userId,
                },
            };

            // Pre-fill customer email on the checkout page
            if (customer) {
                sessionParams.customer = customer;
            } else if (customerEmail) {
                sessionParams.customer_email = customerEmail;
            }

            // For subscriptions, attach userId in subscription metadata so
            // the webhook (checkout.session.completed / invoice.*) can read it
            if (isRecurring) {
                sessionParams.subscription_data = {
                    metadata: {
                        userId,
                    },
                    trial_period_days: 7,
                };
            }

            // For one-time payments, attach metadata to the payment intent
            if (!isRecurring) {
                sessionParams.payment_intent_data = {
                    metadata: {
                        userId,
                    },
                };
            }

            const session = await stripe.checkout.sessions.create(sessionParams);

            return new Response(
                JSON.stringify({ sessionId: session.id, url: session.url }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            );
        }

        // ---------------------------------------------------------------
        // Path B: Cart-based checkout (store / marketplace items array)
        //   Original behavior preserved for backwards compatibility
        // ---------------------------------------------------------------
        if (!items || items.length === 0) {
            throw new Error('Either priceId or items array is required.');
        }

        // Format line items for Stripe
        const lineItems = items.map((item: any) => {
            // If product already has a Stripe Price ID, use it directly
            if (item.stripePriceId) {
                return {
                    price: item.stripePriceId,
                    quantity: item.quantity || 1,
                };
            }

            // Otherwise, construct price data dynamically
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                        metadata: {
                            productId: item.id,
                        },
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity || 1,
            };
        });

        // Create Checkout Session (cart mode — always payment)
        const session = await stripe.checkout.sessions.create({
            // No payment_method_types — Stripe auto-enables wallet payments
            line_items: lineItems,
            mode: 'payment',
            success_url:
                successUrl ||
                `${req.headers.get('origin')}/store/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/store`,
            client_reference_id: userId,
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            ...(customer ? { customer } : {}),
            allow_promotion_codes: true,
            metadata: {
                order_type: 'store_purchase',
                user_id: userId,
            },
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
