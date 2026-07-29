async function getStripePriceId(item) {
    const itemId = item.id;
    const stripeData = loadStripeData();
    const stored = stripeData.products[itemId];
    
    // If we already created a Stripe product/price for this item, reuse it
    if (stored && stored.stripePriceId && stored.stripeProductId) {
        return stored.stripePriceId;
    }

    // Otherwise, create it dynamically on Stripe using data passed from the frontend/Supabase
    const unitAmount = Math.round(Number(item.price) * 100); // convert dollars to cents
    const catalogItem = {
        name: item.name,
        description: item.description || 'Custom 3D printed part.',
        unit_amount: unitAmount,
        currency: 'usd',
    };

    const mapping = await createStripeProductForItem(catalogItem);
    stripeData.products[itemId] = {
        ...mapping,
        name: catalogItem.name,
        description: catalogItem.description,
        unit_amount: catalogItem.unit_amount,
        currency: catalogItem.currency,
    };
    saveStripeData(stripeData);
    return mapping.stripePriceId;
}

app.use(express.json());
app.use(express.static(publicFolder));

app.post('/create-checkout-session', async (req, res) => {
    try {
        const items = req.body.items;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Cart items are required.' });
        }

        const lineItems = [];
        for (const item of items) {
            if (!item.id || !item.quantity || item.quantity < 1) {
                return res.status(400).json({ message: 'Each cart item must have an id, price, and quantity.' });
            }

            const priceId = await getStripePriceId(item);
            lineItems.push({ price: priceId, quantity: item.quantity });
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

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Unable to create checkout session.' });
    }
});
