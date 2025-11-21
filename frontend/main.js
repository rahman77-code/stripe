import { loadStripe } from '@stripe/stripe-js';

// Router implementation
const routes = {
  '/': renderBillingPage,
  '/billing-link': renderBillingPage,
};

// Get current route
function getCurrentRoute() {
  const path = window.location.pathname;
  return path === '' ? '/' : path;
}

// Check if we're on success page
function isSuccessPage() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('success') === 'true';
}

// Render the appropriate page based on route
async function render() {
  const app = document.getElementById('app');
  
  // Check if this is a success redirect
  if (isSuccessPage()) {
    renderReturnPage(app);
    return;
  }
  
  const route = getCurrentRoute();
  const renderFunction = routes[route] || renderBillingPage;
  
  app.innerHTML = '<div class="loading">Loading...</div>';
  await renderFunction(app);
}

// Billing page (main checkout page)
async function renderBillingPage(app) {
  app.innerHTML = `
    <div class="container">
      <h1>Add Payment Method</h1>
      <p class="description">Add a card (you will not be charged now).</p>
      <div id="checkout" class="checkout-container">
        <!-- Stripe Embedded Checkout will be mounted here -->
      </div>
    </div>
  `;

  try {
    // Get environment variables
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    // Validate publishable key
    if (!publishableKey) {
      throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is required but not found in environment variables');
    }
    
    if (!publishableKey.startsWith('pk_')) {
      throw new Error('VITE_STRIPE_PUBLISHABLE_KEY must start with pk_');
    }
    
    // Validate backend URL
    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL is required but not found in environment variables');
    }

    // Initialize Stripe
    const stripe = await loadStripe(publishableKey);

    // Create setup session on backend
    const response = await fetch(`${backendUrl}/api/create-setup-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { client_secret } = await response.json();

    // Initialize Embedded Checkout
    const checkout = await stripe.initEmbeddedCheckout({
      clientSecret: client_secret,
    });

    // Mount Embedded Checkout
    checkout.mount('#checkout');

  } catch (error) {
    console.error('Error setting up checkout:', error);
    app.innerHTML = `
      <div class="container">
        <div class="error">
          <h2>Error</h2>
          <p>${error.message}</p>
          <p>Make sure both backend and frontend servers are running.</p>
        </div>
      </div>
    `;
  }
}

// Return page (success page)
function renderReturnPage(app) {
  // Get session_id from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  app.innerHTML = `
    <div class="container">
      <div class="success">
        <h1>✅ Success!</h1>
        <p>Card saved successfully. No charge was made.</p>
        ${sessionId ? `<p class="session-info">Session ID: ${sessionId}</p>` : ''}
        <a href="/" class="button">Add Another Card</a>
      </div>
    </div>
  `;
}

// Handle browser navigation
window.addEventListener('popstate', render);

// Initial render
render();
