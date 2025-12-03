import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required but not found in environment variables');
}

if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required but not found in environment variables');
}

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4242;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
})); // Restrict CORS to frontend domain only
app.use(express.json()); // Parse JSON bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create setup session endpoint
app.post('/api/create-setup-session', async (req, res) => {
  try {
    // Create a new customer (phone will be updated separately if provided)
    const customer = await stripe.customers.create({
      metadata: {
        created_at: new Date().toISOString(),
      }
    });

    // Create Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: 'setup', // Save card, no charge
      ui_mode: 'embedded', // Iframe embedded checkout
      customer: customer.id,
      payment_method_types: ['card'],
      return_url: `${process.env.FRONTEND_URL}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    });

    // Return client secret and customer ID to frontend
    res.json({ 
      clientSecret: session.client_secret,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Error creating setup session:', error);
    res.status(500).json({ 
      error: 'Failed to create setup session',
      message: error.message 
    });
  }
});

// Update customer phone endpoint
app.post('/api/update-customer-phone', async (req, res) => {
  try {
    const { customerId, phone } = req.body;

    // Validate required fields
    if (!customerId || typeof customerId !== 'string' || customerId.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Customer ID is required',
        message: 'Please provide a valid customer ID'
      });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Phone number is required',
        message: 'Please provide a valid phone number'
      });
    }

    // Validate phone format - should be US format: +1XXXXXXXXXX
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's a valid US phone number (+1 followed by 10 digits)
    const usPhoneRegex = /^\+1\d{10}$/;
    
    if (!usPhoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ 
        error: 'Invalid phone format',
        message: 'Phone number must be a valid US number in format +1XXXXXXXXXX'
      });
    }

    // Update customer with phone
    await stripe.customers.update(customerId, {
      phone: cleanedPhone,
      metadata: {
        phone: cleanedPhone,
      }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating customer phone:', error);
    res.status(500).json({ 
      error: 'Failed to update customer phone',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔒 Using Stripe in ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode`);
});
