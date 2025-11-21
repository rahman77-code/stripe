# Stripe Card on File Demo - Production Ready

A production-ready full-stack application for saving customer payment methods using Stripe's Embedded Checkout in Setup Mode. No charges are made - this only saves the card for future use.

## Features

- **Backend**: Node.js + Express API with Stripe integration
- **Frontend**: Vite + Vanilla JavaScript with Stripe Embedded Checkout
- **Setup Mode**: Saves card without charging
- **No Database**: Creates new Stripe customer each time (for demo purposes)
- **Modern JavaScript**: Uses ES modules throughout

## Prerequisites

- Node.js (v14 or higher)
- Stripe account with test API keys
- npm or yarn

## Production Deployment on Render

### Prerequisites
- Stripe account with LIVE API keys
- GitHub repository with this code
- Render account (free tier works)

### Step 1: Deploy Backend to Render

1. **Create New Web Service** on Render
2. **Connect your GitHub repo**
3. **Configure build settings**:
   - **Name**: `stripe-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables**:
   - `STRIPE_SECRET_KEY` = `sk_live_YOUR_ACTUAL_SECRET_KEY`
   - `FRONTEND_URL` = `https://YOUR-FRONTEND.onrender.com` (you'll update this after deploying frontend)

5. **Deploy** - Note your backend URL: `https://stripe-backend.onrender.com`

### Step 2: Deploy Frontend to Render

1. **Create New Static Site** on Render
2. **Connect your GitHub repo**
3. **Configure build settings**:
   - **Name**: `stripe-frontend` (or your choice)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Add Environment Variables**:
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY`
   - `VITE_BACKEND_URL` = `https://stripe-backend.onrender.com` (your backend URL from Step 1)

5. **Deploy** - Note your frontend URL: `https://stripe-frontend.onrender.com`

### Step 3: Update Backend FRONTEND_URL

1. Go back to your **Backend service** on Render
2. Update the `FRONTEND_URL` environment variable to your actual frontend URL
3. **Redeploy** the backend

### Step 4: Verify Deployment

1. Visit your frontend URL
2. Test saving a card (remember: this is LIVE mode - real cards will work)
3. Check Stripe Dashboard (live mode) for saved customers

## Local Development

### 1. Install dependencies

```bash
# Install all dependencies
npm run install-all
```

### 2. Set up environment variables

Create `backend/.env`:
```
STRIPE_SECRET_KEY=sk_test_your_test_key_for_development
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_for_development
VITE_BACKEND_URL=http://localhost:4242
```

### 3. Run locally

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## How It Works

1. **User visits the billing page** at http://localhost:3000
2. **Frontend requests a setup session** from the backend
3. **Backend creates**:
   - A new Stripe Customer
   - A Checkout Session in `setup` mode with `embedded` UI
4. **Frontend receives** the session's `client_secret` and mounts Embedded Checkout
5. **User enters card details** in Stripe's secure iframe
6. **After completion**, user is redirected to the success page
7. **Card is saved** to the customer in Stripe (no charge made)

## Project Structure

```
stripe-card-on-file-demo/
├── backend/
│   ├── server.js          # Express server with Stripe integration
│   ├── package.json       # Backend dependencies
│   ├── .env              # Secret environment variables (create this)
│   └── env.example       # Example environment file
├── frontend/
│   ├── index.html        # Main HTML entry point
│   ├── main.js           # Frontend JavaScript with routing
│   ├── style.css         # Basic styling
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.js    # Vite configuration
│   ├── .env              # Frontend environment variables (create this)
│   └── env.example       # Example environment file
├── package.json          # Root package.json with convenience scripts
└── README.md            # This file
```

## API Endpoints

### POST `/api/create-setup-session`

Creates a new Stripe Customer and Checkout Session in setup mode.

**Response:**
```json
{
  "client_secret": "cs_test_..."
}
```

## Security Best Practices

### Production Security
- **Secret Key**: Only stored in backend environment variables, never in code
- **Publishable Key**: Safe to expose in frontend
- **CORS**: Restricted to your frontend domain only
- **HTTPS**: Render provides SSL certificates automatically
- **Environment Variables**: Never committed to Git

### Key Security Rules
1. **NEVER** expose `sk_live_` keys in frontend code
2. **NEVER** commit `.env` files to Git
3. **ALWAYS** use environment variables for sensitive data
4. **ALWAYS** validate environment variables on startup
5. **ALWAYS** use HTTPS in production

## Next Steps

For a production application, you would typically:

1. **Add a database** to store customer references
2. **Implement user authentication**
3. **Link Stripe customers to your users**
4. **Add webhook handling** for payment method events
5. **Implement proper error handling and logging**
6. **Add payment method management UI**
7. **Set up proper CORS rules** for production domains

## Troubleshooting

### Production Issues

#### Frontend can't connect to backend
- Verify `VITE_BACKEND_URL` in frontend env vars matches your backend URL
- Check backend logs in Render dashboard
- Ensure backend is deployed and running

#### CORS errors
- Verify `FRONTEND_URL` in backend env vars exactly matches your frontend URL (including https://)
- Make sure there's no trailing slash in URLs

#### "Invalid API Key" errors
- Ensure you're using LIVE keys (`pk_live_` and `sk_live_`) in production
- Verify keys are correctly set in Render environment variables
- Check you're not mixing test and live keys

### Local Development Issues

#### "Environment variable not found" errors
- Create `.env` files in both `backend/` and `frontend/` directories
- Restart servers after creating/updating .env files

#### "Failed to create setup session" error
- Verify backend is running on port 4242
- Check your Stripe secret key is correct
- Look at backend console for detailed errors

## Resources

- [Stripe Embedded Checkout](https://stripe.com/docs/payments/checkout/embedded)
- [Stripe Setup Mode](https://stripe.com/docs/payments/save-and-reuse)
- [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
- [Vite Documentation](https://vitejs.dev/)

## License

This is a demo project for educational purposes.
