-- Organizations & SSO Schema
-- Enterprise B2B: org management, member roles, SSO configuration
-- Supports clinic, school, agency, and enterprise plan types

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('clinic', 'school', 'agency', 'enterprise')),
  seat_count INTEGER NOT NULL DEFAULT 5,

  -- Owner (maps to auth.users)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- SSO Configuration
  sso_enabled BOOLEAN NOT NULL DEFAULT false,
  sso_provider TEXT CHECK (sso_provider IN ('saml', 'oidc', 'okta', 'azure-ad', 'google-workspace')),
  sso_entity_id TEXT,
  sso_metadata_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'pending_setup')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug lookup index (used for SSO login flow)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
-- Owner lookup
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
-- Status filter
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org admins (owner) can read and manage their own org
DROP POLICY IF EXISTS "Org owners can manage their org" ON organizations;
CREATE POLICY "Org owners can manage their org" ON organizations
  FOR ALL USING (
    owner_id = auth.uid()
  );

-- Org members can read their org (via organization_members join)
DROP POLICY IF EXISTS "Org members can read their org" ON organizations;
CREATE POLICY "Org members can read their org" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  email TEXT NOT NULL,

  -- Invitation tracking
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'deactivated', 'removed')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary lookup: org + user (unique active membership)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user
  ON organization_members(org_id, user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

-- Query by org (member list)
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
-- Query by user (which orgs am I in?)
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
-- Query by email (invitation lookup before user_id is set)
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(email);
-- Status filter
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(org_id, status);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Org admins can manage members in their org
DROP POLICY IF EXISTS "Org admins can manage members" ON organization_members;
CREATE POLICY "Org admins can manage members" ON organization_members
  FOR ALL USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Members can read their own membership
DROP POLICY IF EXISTS "Members can read own membership" ON organization_members;
CREATE POLICY "Members can read own membership" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Members can read other members in same org (for directory/collaboration)
DROP POLICY IF EXISTS "Members can read org roster" ON organization_members;
CREATE POLICY "Members can read org roster" ON organization_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS org_members_updated_at ON organization_members;
CREATE TRIGGER org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
