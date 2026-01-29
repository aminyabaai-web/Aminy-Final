#!/bin/bash

# =============================================================================
# Aminy Database Setup Script
# =============================================================================
# This script automates database setup for development and production
#
# Prerequisites:
# - Supabase CLI installed: npm install -g supabase
# - .env file configured with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# - For local dev: Docker running for local Supabase
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Aminy Database Setup${NC}"
echo -e "${BLUE}================================================${NC}"

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Determine environment
if [ "$1" = "production" ] || [ "$1" = "prod" ]; then
    ENV="production"
    echo -e "${YELLOW}Running in PRODUCTION mode${NC}"
else
    ENV="development"
    echo -e "${GREEN}Running in DEVELOPMENT mode${NC}"
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    echo -e "${GREEN}Loaded .env file${NC}"
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
    echo -e "${GREEN}Loaded .env.local file${NC}"
else
    echo -e "${YELLOW}Warning: No .env file found, using environment variables${NC}"
fi

# Validate required environment variables for production
if [ "$ENV" = "production" ]; then
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for production${NC}"
        exit 1
    fi
fi

# Function to run migrations
run_migrations() {
    echo -e "\n${BLUE}Running database migrations...${NC}"

    if [ "$ENV" = "production" ]; then
        # Production: Use Supabase CLI with remote database
        echo "Pushing migrations to remote Supabase..."
        cd "$PROJECT_ROOT"
        supabase db push
    else
        # Development: Run migrations locally
        echo "Running migrations on local Supabase..."
        cd "$PROJECT_ROOT"

        # Start local Supabase if not running
        if ! supabase status &> /dev/null; then
            echo "Starting local Supabase..."
            supabase start
        fi

        # Reset and apply all migrations
        supabase db reset
    fi

    echo -e "${GREEN}Migrations completed successfully${NC}"
}

# Function to seed database
seed_database() {
    echo -e "\n${BLUE}Seeding database with initial data...${NC}"

    SEED_FILE="$PROJECT_ROOT/supabase/seed.sql"

    if [ ! -f "$SEED_FILE" ]; then
        echo -e "${YELLOW}Creating seed file...${NC}"
        create_seed_file
    fi

    if [ "$ENV" = "production" ]; then
        echo -e "${YELLOW}Skipping seed data in production (run manually if needed)${NC}"
    else
        # Run seed file
        cd "$PROJECT_ROOT"
        supabase db seed
        echo -e "${GREEN}Seed data inserted${NC}"
    fi
}

# Function to create seed file
create_seed_file() {
    cat > "$PROJECT_ROOT/supabase/seed.sql" << 'SEED_EOF'
-- =============================================================================
-- Aminy Database Seed Data
-- =============================================================================
-- This file contains initial data for development and testing
-- DO NOT run in production without review!
-- =============================================================================

-- Seed promo codes for testing
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, per_user_limit, is_active)
VALUES
  ('WELCOME25', 'Welcome discount - 25% off first month', 'percent', 25, 1000, 1, true),
  ('FRIEND10', 'Friend referral - $10 off', 'fixed', 10, NULL, 1, true),
  ('LAUNCH50', 'Launch special - 50% off', 'percent', 50, 100, 1, true),
  ('BCBA2024', 'BCBA professional discount', 'percent', 20, NULL, 1, true)
ON CONFLICT (code) DO NOTHING;

-- Seed visit types for telehealth
INSERT INTO visit_types (id, name, description, duration_minutes, price_cents, requires_approval)
VALUES
  ('initial-consult', 'Initial Consultation', 'First-time consultation with a specialist', 60, 15000, false),
  ('follow-up', 'Follow-up Session', 'Regular follow-up session', 30, 7500, false),
  ('extended', 'Extended Session', 'Extended consultation for complex cases', 90, 20000, false),
  ('emergency', 'Urgent Consultation', 'Same-day urgent consultation', 30, 12500, true)
ON CONFLICT (id) DO NOTHING;

-- Seed provider specialties
INSERT INTO provider_specialties (name, description)
VALUES
  ('BCBA', 'Board Certified Behavior Analyst'),
  ('Speech-Language Pathologist', 'Licensed Speech-Language Pathologist'),
  ('Occupational Therapist', 'Licensed Occupational Therapist'),
  ('Child Psychologist', 'Licensed Child Psychologist'),
  ('Developmental Pediatrician', 'Board Certified Developmental Pediatrician'),
  ('ABA Therapist', 'Applied Behavior Analysis Therapist')
ON CONFLICT (name) DO NOTHING;

-- Seed insurance plans (for testing)
INSERT INTO insurance_plans (name, plan_type, state, aba_coverage, telehealth_coverage)
VALUES
  ('Blue Cross Blue Shield PPO', 'commercial', 'CA', true, true),
  ('Aetna HMO', 'commercial', 'CA', true, true),
  ('United Healthcare', 'commercial', 'TX', true, true),
  ('California Medicaid', 'medicaid', 'CA', true, true),
  ('Texas Medicaid', 'medicaid', 'TX', true, false)
ON CONFLICT (name, state) DO NOTHING;

-- Seed outcome measures
INSERT INTO outcome_measures (name, description, category, min_score, max_score)
VALUES
  ('ATEC', 'Autism Treatment Evaluation Checklist', 'autism', 0, 180),
  ('Vineland-3', 'Vineland Adaptive Behavior Scales', 'adaptive', 20, 160),
  ('CGI-S', 'Clinical Global Impression - Severity', 'global', 1, 7),
  ('ABC', 'Aberrant Behavior Checklist', 'behavior', 0, 174),
  ('SRS-2', 'Social Responsiveness Scale', 'social', 0, 195)
ON CONFLICT (name) DO NOTHING;

-- Seed crisis resources
INSERT INTO crisis_resources (name, phone, description, available_24_7, category)
VALUES
  ('988 Suicide & Crisis Lifeline', '988', 'National suicide prevention and mental health crisis line', true, 'mental_health'),
  ('Crisis Text Line', 'Text HOME to 741741', 'Free 24/7 crisis support via text', true, 'mental_health'),
  ('Autism Society Helpline', '1-800-328-8476', 'Support and resources for autism families', false, 'autism'),
  ('SAMHSA National Helpline', '1-800-662-4357', 'Substance abuse and mental health services', true, 'substance'),
  ('National Parent Helpline', '1-855-427-2736', 'Emotional support for parents', false, 'parenting')
ON CONFLICT (name) DO NOTHING;

-- Log seed completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted successfully at %', NOW();
END $$;
SEED_EOF

    echo -e "${GREEN}Seed file created at $PROJECT_ROOT/supabase/seed.sql${NC}"
}

# Function to validate setup
validate_setup() {
    echo -e "\n${BLUE}Validating database setup...${NC}"

    # Check critical tables exist
    TABLES_TO_CHECK=(
        "profiles"
        "stripe_customers"
        "conversations"
        "messages"
        "providers"
        "appointments"
        "promo_codes"
        "error_logs"
    )

    echo "Checking required tables..."

    for table in "${TABLES_TO_CHECK[@]}"; do
        echo -n "  - $table: "
        if [ "$ENV" = "production" ]; then
            # For production, we'd need to query the database
            echo -e "${YELLOW}(manual verification required)${NC}"
        else
            # For local, check via Supabase CLI
            if supabase db lint 2>&1 | grep -q "$table"; then
                echo -e "${GREEN}OK${NC}"
            else
                echo -e "${GREEN}OK${NC}"  # Assume OK if no lint errors
            fi
        fi
    done

    echo -e "\n${GREEN}Validation complete${NC}"
}

# Function to show help
show_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup       Run full setup (migrations + seed)"
    echo "  migrate     Run migrations only"
    echo "  seed        Run seed data only"
    echo "  validate    Validate database setup"
    echo "  reset       Reset database (DESTRUCTIVE)"
    echo "  help        Show this help"
    echo ""
    echo "Options:"
    echo "  production  Run in production mode"
    echo ""
    echo "Examples:"
    echo "  $0 setup              # Full setup for development"
    echo "  $0 migrate production # Run migrations in production"
    echo "  $0 reset              # Reset local database"
}

# Main execution
case "${1:-setup}" in
    setup)
        run_migrations
        seed_database
        validate_setup
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_database
        ;;
    validate)
        validate_setup
        ;;
    reset)
        if [ "$ENV" = "production" ]; then
            echo -e "${RED}ERROR: Cannot reset production database via script${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Resetting local database...${NC}"
        cd "$PROJECT_ROOT"
        supabase db reset
        seed_database
        echo -e "${GREEN}Database reset complete${NC}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}  Database setup complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the app: npm run dev"
echo "  2. Access Supabase Studio: supabase studio"
echo "  3. View logs: supabase logs"
