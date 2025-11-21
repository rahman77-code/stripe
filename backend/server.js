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
    // Create a new customer (for MVP, create new one each time)
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
      return_url: `${process.env.FRONTEND_URL}/billing-return?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Return client secret to frontend
    res.json({ 
      client_secret: session.client_secret 
    });

  } catch (error) {
    console.error('Error creating setup session:', error);
    res.status(500).json({ 
      error: 'Failed to create setup session',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔒 Using Stripe in ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode`);
});
