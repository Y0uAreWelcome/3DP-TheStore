const path = require('path');
const fs = require('fs');
const express = require('express');
const Stripe = require('stripe');
require('dotenv').config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const app = express();

const publicFolder = __dirname;
const pageAliases = {
    products: 'products.html',
    services: 'services.html',
    contact: 'contact.html',
    success: 'success.html',
    cancel: 'cancel.html',
};

app.use(express.json());
app.use(express.static(publicFolder));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicFolder, 'index.html'));
});

app.get('/:page', (req, res, next) => {
    const requestedPage = req.params.page;
    if (requestedPage in pageAliases) {
        const filePath = path.join(publicFolder, pageAliases[requestedPage]);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    return next();
});

async function createCheckoutSessionHandler(req, res) {
    try {
        if (!stripe) {
            return res.status(500).json({ message: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to your Vercel environment variables.' });
        }

        const items = req.body.items;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Cart items are required.' });
        }

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

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${baseUrl}/success.html`,
            cancel_url: `${baseUrl}/cancel.html`,
        });

        return res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || 'Unable to create checkout session.' });
    }
}

app.post('/api/create-checkout-session', createCheckoutSessionHandler);
app.post('/create-checkout-session', createCheckoutSessionHandler);

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}

module.exports = app;
