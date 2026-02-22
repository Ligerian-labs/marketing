# 🎯 Post-Payment Account Creation Flow

## Overview
This PR implements a new user onboarding flow that allows customers to purchase formations without creating an account first. After payment, the system automatically creates their account and sends a secure password setup email.

## New User Flow
1. **Purchase**: User clicks "Acheter" → goes directly to Stripe Checkout (no login required)
2. **Account Creation**: Stripe webhook automatically creates account with customer email
3. **Password Setup**: User receives secure email with 48h expiring token
4. **Access**: User sets password → auto-login → accesses purchased formations

## 🔧 Technical Changes

### Database Schema
- Added `password_tokens` table with secure token management
- Indexed for performance
- Auto-expiring tokens (48h)

### Auth System Extensions
- `createUserWithoutPassword()` - creates account with unguessable temp password  
- `createPasswordToken()` - generates secure setup tokens
- `getValidPasswordToken()` - validates tokens with expiry/usage checks
- `setPassword()` + `markTokenUsed()` - secure password setting flow

### Email Integration  
- New `src/lib/email.ts` with professional setup email template
- Uses `process.env.RESEND_API_KEY` (fixed Docker runtime issue)
- Responsive HTML design with clear CTA

### Stripe Integration
- Updated checkout to work without authentication
- Enhanced webhook to handle email/name from Stripe session  
- Improved error handling for new user creation

### User Experience
- New `/auth/setup-password` page with secure validation
- Success messages for completed setup
- Clear error handling for expired/invalid tokens
- Auto-login after password setup

## 🔒 Security Features
- Crypto-secure random tokens (UUID v4)
- 48-hour token expiration
- One-time use tokens
- Bcrypt password hashing
- HTTPS-only secure cookies

## 🚀 Benefits
- **Lower friction**: No account required for purchase
- **Higher conversion**: Streamlined checkout process  
- **Better security**: Secure token-based setup
- **Professional experience**: Branded emails with clear instructions

## ⚡ Runtime Fixes
- Fixed Resend API key to use `process.env` instead of `import.meta.env` (Docker compatibility)
- Maintains backward compatibility with existing authenticated flow

## Testing
- [x] Build passes
- [x] Database schema initializes correctly
- [x] Email helper compiles
- [x] Webhook handles both authenticated/non-authenticated purchases
- [x] Setup page validates tokens securely

## 🎨 French UI
All user-facing text in French as per brand guidelines.

## 🔄 Backward Compatibility
Existing users and authenticated checkout flow remain unchanged. New flow only applies to non-authenticated purchases.