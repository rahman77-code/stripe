import { loadStripe } from '@stripe/stripe-js';

// Top-level variables
let stripe;
let checkoutInstance = null;

// Phone validation helper
function validatePhone(phone) {
  // Strip spaces
  const cleaned = phone.replace(/\s/g, '');
  
  // Check for optional leading plus and then 10-15 digits
  const phoneRegex = /^\+?\d{10,15}$/;
  
  return phoneRegex.test(cleaned);
}

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
      <p class="description">
        <strong>HireyAI Fasthire</strong><br>
        FastHire™ is an on-demand hiring service designed specifically for the caregiver and CNA industry. This service will provide show up interviews for non-certified & HHA candidates for $24.90 and CNA candidates for $34.90. After you have put your card on file, we will bill per show up interview at the end of the business day.
      </p>
      
      <div class="phone-form" id="phone-form">
        <label for="phone-input" class="phone-label">Phone number</label>
        <input 
          type="tel" 
          id="phone-input" 
          name="phone"
          class="phone-input" 
          placeholder="+1 234 567 8900"
          autocomplete="tel"
        />
        <p class="phone-helper">Please enter the phone number you used to sign up for Hirey AI. We use this to match your payment with your account.</p>
        <div id="phone-error" class="phone-error" style="display: none;"></div>
        <div id="phone-success" class="phone-success" style="display: none;">✓ Phone number saved</div>
      </div>
      
      <div id="checkout" class="checkout-container">
        <div class="loading">Loading checkout...</div>
      </div>
    </div>
  `;

  try {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    if (!publishableKey) {
      throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is required but not found in environment variables');
    }
    
    if (!publishableKey.startsWith('pk_')) {
      throw new Error('VITE_STRIPE_PUBLISHABLE_KEY must start with pk_');
    }
    
    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL is required but not found in environment variables');
    }

    // Initialize Stripe once
    if (!stripe) {
      stripe = await loadStripe(publishableKey);
    }

    const phoneInput = document.getElementById('phone-input');
    const phoneError = document.getElementById('phone-error');
    const phoneSuccess = document.getElementById('phone-success');
    const checkoutContainer = document.getElementById('checkout');

    let customerId = null;
    let lastSavedPhone = null;

    // Guard: only create one embedded checkout per page load
    if (checkoutInstance) {
      return;
    }

    // Create checkout session immediately on page load
    try {
      const response = await fetch(`${backendUrl}/api/create-setup-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      console.log('Received from backend:', responseData);
      console.log('clientSecret:', responseData.clientSecret);
      console.log('customerId:', responseData.customerId);
      
      const { clientSecret, customerId: returnedCustomerId } = responseData;
      
      if (!clientSecret) {
        throw new Error('No client secret received from backend');
      }
      
      customerId = returnedCustomerId;

      // Create and mount embedded checkout
      checkoutInstance = await stripe.initEmbeddedCheckout({
        clientSecret: clientSecret,
      });

      checkoutContainer.innerHTML = '';
      checkoutInstance.mount('#checkout');
      
    } catch (error) {
      console.error('Error starting checkout:', error);
      checkoutContainer.innerHTML = `
        <div class="error">
          <p>${error.message || 'Could not start checkout. Please try again.'}</p>
        </div>
      `;
    }

    // Function to update customer phone
    async function updateCustomerPhone(phone) {
      if (!customerId) {
        console.error('No customer ID available');
        return;
      }

      // Guard: don't update if same phone was already saved
      if (phone === lastSavedPhone) {
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/update-customer-phone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, phone }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to save phone');
        }

        lastSavedPhone = phone;
        phoneSuccess.style.display = 'block';
        phoneError.style.display = 'none';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          phoneSuccess.style.display = 'none';
        }, 3000);

      } catch (error) {
        console.error('Error updating phone:', error);
        phoneError.textContent = error.message || 'Failed to save phone number';
        phoneError.style.display = 'block';
        phoneSuccess.style.display = 'none';
      }
    }

    // Validate and update phone on blur
    phoneInput.addEventListener('blur', async () => {
      const phone = phoneInput.value.trim();
      
      if (!phone) {
        // Empty, clear messages
        phoneError.style.display = 'none';
        phoneSuccess.style.display = 'none';
        return;
      }
      
      // Validate phone
      if (!validatePhone(phone)) {
        phoneError.textContent = 'Please enter a valid phone number (10-15 digits, optional + prefix)';
        phoneError.style.display = 'block';
        phoneSuccess.style.display = 'none';
        return;
      }
      
      // Valid phone - update customer
      await updateCustomerPhone(phone);
    });

  } catch (error) {
    console.error('Error setting up page:', error);
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
