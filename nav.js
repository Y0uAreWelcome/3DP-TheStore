const navContainer = document.getElementById('site-nav');
if (navContainer) {
    navContainer.innerHTML = `
<nav class="navbar" aria-label="Primary navigation">
    <a class="logo" href="index.html"><span class="logo-icon" aria-hidden="true">3Dp</span><span class="logo-text">The Store</span></a>
    <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li class="dropdown">
            <a href="products.html" aria-haspopup="true" aria-expanded="false">Products</a>
            <div class="dropdown-menu">
                <a href="products.html#fpv-parts" class="dropdown-item">
                    <span class="dropdown-image" aria-hidden="true">✈️</span>
                    <span>FPV Parts</span>
                </a>
            </div>
        </li>
        <li><a href="services.html">Services</a></li>
        <li><a href="contact.html">Contact</a></li>
    </ul>
    <div class="nav-actions">
        <button class="cart-toggle" aria-label="Toggle cart menu" aria-expanded="false">
            <span class="cart-icon" aria-hidden="true"><span class="cart-object"></span></span>
            <span class="cart-label">Cart</span>
            <span class="cart-badge">0</span>
        </button>
    </div>
</nav>
`;

    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const activeLink = navContainer.querySelector(`.nav-links a[href="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}
