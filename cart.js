const CART_STORAGE_KEY = '3dp_store_cart';

async function createStripeCheckoutSession(cart) {
    const payload = {
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || 'Custom 3D printed part.',
            price: item.price,
            quantity: item.quantity,
        })),
    };

    const endpoints = ['/api/create-checkout-session', '/create-checkout-session'];

    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const rawText = await response.text();
            let data = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.message || rawText || 'Unable to create checkout session.');
            }

            if (!data.url) {
                throw new Error('The checkout endpoint did not return a Stripe session URL.');
            }

            return data.url;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Unable to create checkout session.');
}

function getCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
    return `$${Number(value).toFixed(2)}`;
}

function updateCartCount() {
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    const navBadge = document.querySelector('.cart-toggle .cart-badge');
    if (badge) badge.textContent = count;
    if (navBadge) navBadge.textContent = count;
    const toggle = document.querySelector('.cart-toggle');
    if (toggle) {
        toggle.classList.toggle('has-items', count > 0);
    }
}

function toggleCartPanel(open) {
    const body = document.body;
    const toggleButton = document.querySelector('.cart-toggle');
    if (open) {
        body.classList.add('cart-open');
        if (toggleButton) toggleButton.setAttribute('aria-expanded', 'true');
    } else {
        body.classList.remove('cart-open');
        if (toggleButton) toggleButton.setAttribute('aria-expanded', 'false');
    }
}

function buildCartItem(item) {
    return `
        <div class="cart-item">
            <div>
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">${formatPrice(item.price)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-actions">
                <button class="cart-btn small" data-cart-action="decrease" data-product-id="${item.id}" aria-label="Decrease quantity of ${item.name}">-</button>
                <button class="cart-btn small" data-cart-action="increase" data-product-id="${item.id}" aria-label="Increase quantity of ${item.name}">+</button>
                <button class="cart-btn small remove" data-cart-action="remove" data-product-id="${item.id}" aria-label="Remove ${item.name}">×</button>
            </div>
        </div>`;
}

function buildCart(cart) {
    const cartRoot = document.getElementById('cart-root');
    if (!cartRoot) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemsHtml = cart.length ? cart.map(buildCartItem).join('') : '<p class="cart-empty">Your cart is empty.</p>';

    cartRoot.innerHTML = `
        <aside class="cart-panel" aria-label="Shopping cart">
            <div class="cart-header">
                <h2>Cart</h2>
                <span class="cart-count">${cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div class="cart-body">${itemsHtml}</div>
            <div class="cart-summary">
                <div class="cart-total">Total: <strong>${formatPrice(total)}</strong></div>
                <div class="cart-actions">
                    <button class="btn" data-cart-action="clear" type="button">Clear Cart</button>
                    <button class="btn btn-secondary" data-cart-action="stripe-checkout" type="button" ${cart.length === 0 ? 'disabled' : ''}>Checkout with Stripe</button>
                </div>
            </div>
        </aside>`;
}

function checkoutCart(cart) {
    const address = '3dpsupport@proton.me';
    const subject = encodeURIComponent('Order from 3DP The Store');
    const lines = cart.map(item => `${item.quantity} x ${item.name} — ${formatPrice(item.price)} each`);
    lines.push('');
    lines.push(`Order total: ${formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}`);
    lines.push('Please reply with payment instructions and shipping information.');
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${address}?subject=${subject}&body=${body}`;
}

async function checkoutWithStripe(cart) {
    const checkoutButton = document.querySelector('[data-cart-action="stripe-checkout"]');
    if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Creating checkout...';
    }

    try {
        const checkoutUrl = await createStripeCheckoutSession(cart);
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error(error);
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = 'Checkout with Stripe';
        }
        window.alert(error.message || 'Unable to start Stripe checkout.');
    }
}

function handleCartAction(event) {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;

    const cart = getCart();
    const productId = button.getAttribute('data-product-id');
    const action = button.getAttribute('data-cart-action');
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (action === 'clear') {
        cart.length = 0;
    } else if (action === 'stripe-checkout') {
        if (cart.length > 0) {
            checkoutWithStripe(cart);
        }
        return;
    } else if (action === 'remove' && itemIndex > -1) {
        cart.splice(itemIndex, 1);
    } else if (action === 'increase' && itemIndex > -1) {
        cart[itemIndex].quantity += 1;
    } else if (action === 'decrease' && itemIndex > -1) {
        cart[itemIndex].quantity = Math.max(1, cart[itemIndex].quantity - 1);
    }

    if (action !== 'checkout') {
        saveCart(cart);
        buildCart(cart);
        updateCartCount();
    }
}

function addProductToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    buildCart(cart);
    updateCartCount();
}

function listenForAddToCart() {
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-add-to-cart]');
        if (!button) return;
        const product = {
            id: button.getAttribute('data-product-id'),
            name: button.getAttribute('data-product-name'),
            price: Number(button.getAttribute('data-product-price')),
            description: button.getAttribute('data-product-description'),
        };
        addProductToCart(product);
    });
}

function listenForCartButtons() {
    document.addEventListener('click', handleCartAction);
}

function listenForCartToggle() {
    const toggle = document.querySelector('.cart-toggle');
    const cartRoot = document.getElementById('cart-root');
    let closeTimer = null;

    if (!toggle || !cartRoot) return;

    const clearCloseTimer = () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
    };

    const scheduleClose = () => {
        clearCloseTimer();
        closeTimer = setTimeout(() => toggleCartPanel(false), 300);
    };

    const openCart = () => {
        clearCloseTimer();
        toggleCartPanel(true);
    };

    toggle.addEventListener('pointerenter', openCart);
    toggle.addEventListener('pointerleave', scheduleClose);
    cartRoot.addEventListener('pointerenter', openCart);
    cartRoot.addEventListener('pointerleave', scheduleClose);

    toggle.addEventListener('click', event => {
        event.preventDefault();
        const isOpen = document.body.classList.contains('cart-open');
        toggleCartPanel(!isOpen);
    });
}

function initCart() {
    const cart = getCart();
    buildCart(cart);
    updateCartCount();
    listenForAddToCart();
    listenForCartButtons();
    listenForCartToggle();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
} else {
    initCart();
}
