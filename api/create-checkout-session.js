const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed.' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: 'STRIPE_SECRET_KEY is not configured for this deployment.' });
    }

    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Cart items are required.' });
    }

    try {
        const lineItems = [];

        for (const item of items) {
            if (!item.id || !item.quantity || item.quantity < 1) {
                return res.status(400).json({ message: 'Each cart item must have an id, price, and quantity.' });
            }

            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        description: item.description || 'Custom 3D printed part.',
                    },
                    unit_amount: Math.round(Number(item.price) * 100),
                },
                quantity: item.quantity,
            });
        }

        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${baseUrl}/success.html`,
            cancel_url: `${baseUrl}/cancel.html`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout session error:', error);
        return res.status(500).json({ message: error.message || 'Unable to create checkout session.' });
    }
};
