module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ message: 'Supabase environment variables are not configured for this deployment.' });
    }

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*`, {
            headers: {
                apikey: supabaseServiceRoleKey,
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                Prefer: 'return=representation',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Unable to fetch Supabase products.');
        }

        const products = await response.json();
        return res.status(200).json(products);
    } catch (error) {
        console.error('Supabase products error:', error);
        return res.status(500).json({ message: error.message || 'Unable to fetch products.' });
    }
};
