#!/bin/bash

# =============================================================================
# Aminy Telehealth Setup Script
# =============================================================================
# This script helps you set up the telehealth infrastructure
# Run this after completing the steps in docs/TELEHEALTH_SETUP.md
# =============================================================================

set -e

echo "🏥 Aminy Telehealth Setup"
echo "========================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "✅ Supabase CLI installed"

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found. Creating from template..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local with your configuration values"
    exit 1
fi

echo "✅ .env.local found"

# Read project ID from .env.local
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.local | cut -d '=' -f2)
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

if [ "$PROJECT_ID" == "your-project-id" ] || [ -z "$PROJECT_ID" ]; then
    echo "❌ Please configure VITE_SUPABASE_URL in .env.local first"
    exit 1
fi

echo "📦 Project ID: $PROJECT_ID"
echo ""

# Menu
echo "What would you like to do?"
echo ""
echo "1) Link Supabase project"
echo "2) Deploy Edge Functions"
echo "3) Set secrets (interactive)"
echo "4) Run database migrations"
echo "5) Full setup (all of the above)"
echo "6) Test deployment"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "🔗 Linking Supabase project..."
        supabase link --project-ref $PROJECT_ID
        echo "✅ Project linked!"
        ;;
    2)
        echo ""
        echo "🚀 Deploying Edge Functions..."
        supabase functions deploy telehealth
        echo "✅ Functions deployed!"
        ;;
    3)
        echo ""
        echo "🔐 Setting secrets..."
        echo ""
        echo "Enter your Stripe Secret Key (sk_test_...):"
        read -s STRIPE_KEY
        supabase secrets set STRIPE_SECRET_KEY=$STRIPE_KEY

        echo ""
        echo "Enter your Daily.co API Key:"
        read -s DAILY_KEY
        supabase secrets set DAILY_API_KEY=$DAILY_KEY

        echo ""
        echo "Enter your SendGrid API Key (SG....):"
        read -s SENDGRID_KEY
        supabase secrets set SENDGRID_API_KEY=$SENDGRID_KEY

        echo ""
        echo "Enter your SendGrid From Email:"
        read SENDGRID_EMAIL
        supabase secrets set SENDGRID_FROM_EMAIL=$SENDGRID_EMAIL

        echo ""
        echo "Enter your Twilio Account SID (AC...):"
        read TWILIO_SID
        supabase secrets set TWILIO_ACCOUNT_SID=$TWILIO_SID

        echo ""
        echo "Enter your Twilio Auth Token:"
        read -s TWILIO_TOKEN
        supabase secrets set TWILIO_AUTH_TOKEN=$TWILIO_TOKEN

        echo ""
        echo "Enter your Twilio Phone Number (+1...):"
        read TWILIO_PHONE
        supabase secrets set TWILIO_PHONE_NUMBER=$TWILIO_PHONE

        echo ""
        echo "✅ Secrets configured!"
        ;;
    4)
        echo ""
        echo "📊 Running database migrations..."
        echo ""
        echo "Please run the following SQL in your Supabase dashboard:"
        echo "supabase/migrations/001_telehealth_schema.sql"
        echo ""
        echo "Go to: https://supabase.com/dashboard/project/$PROJECT_ID/sql"
        ;;
    5)
        echo ""
        echo "🔄 Running full setup..."
        echo ""

        # Link project
        echo "Step 1/4: Linking project..."
        supabase link --project-ref $PROJECT_ID

        # Set secrets
        echo ""
        echo "Step 2/4: Setting secrets..."
        echo "(Press Enter to skip any service you don't want to configure)"
        echo ""

        read -p "Stripe Secret Key (sk_test_...): " -s STRIPE_KEY
        if [ ! -z "$STRIPE_KEY" ]; then
            supabase secrets set STRIPE_SECRET_KEY=$STRIPE_KEY
        fi

        echo ""
        read -p "Daily.co API Key: " -s DAILY_KEY
        if [ ! -z "$DAILY_KEY" ]; then
            supabase secrets set DAILY_API_KEY=$DAILY_KEY
        fi

        echo ""
        read -p "SendGrid API Key (SG....): " -s SENDGRID_KEY
        if [ ! -z "$SENDGRID_KEY" ]; then
            supabase secrets set SENDGRID_API_KEY=$SENDGRID_KEY
            read -p "SendGrid From Email: " SENDGRID_EMAIL
            supabase secrets set SENDGRID_FROM_EMAIL=$SENDGRID_EMAIL
        fi

        echo ""
        read -p "Twilio Account SID (AC...): " TWILIO_SID
        if [ ! -z "$TWILIO_SID" ]; then
            supabase secrets set TWILIO_ACCOUNT_SID=$TWILIO_SID
            read -p "Twilio Auth Token: " -s TWILIO_TOKEN
            supabase secrets set TWILIO_AUTH_TOKEN=$TWILIO_TOKEN
            echo ""
            read -p "Twilio Phone Number (+1...): " TWILIO_PHONE
            supabase secrets set TWILIO_PHONE_NUMBER=$TWILIO_PHONE
        fi

        # Deploy functions
        echo ""
        echo "Step 3/4: Deploying Edge Functions..."
        supabase functions deploy telehealth

        # Migrations reminder
        echo ""
        echo "Step 4/4: Database migrations"
        echo "Please run the SQL migration manually in Supabase dashboard:"
        echo "https://supabase.com/dashboard/project/$PROJECT_ID/sql"
        echo "File: supabase/migrations/001_telehealth_schema.sql"

        echo ""
        echo "✅ Setup complete!"
        ;;
    6)
        echo ""
        echo "🧪 Testing deployment..."
        echo ""
        curl -s "https://$PROJECT_ID.supabase.co/functions/v1/telehealth/providers" \
            -H "Authorization: Bearer $(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)" \
            | head -c 500
        echo ""
        echo ""
        echo "✅ If you see provider data above, the deployment is working!"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed setup instructions, see: docs/TELEHEALTH_SETUP.md"
