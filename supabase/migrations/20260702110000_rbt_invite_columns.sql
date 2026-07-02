-- RBT roster invite columns
-- An invited RBT may not have an Aminy auth account yet, so rbt_org_assignments
-- rows can carry a null rbt_user_id. These columns keep the invitee's name and
-- email visible on the BCBA's roster (RBTManagement + SupervisionDashboard)
-- until the RBT signs up and the row is linked to their auth user id.

ALTER TABLE public.rbt_org_assignments ADD COLUMN IF NOT EXISTS invite_name  text;
ALTER TABLE public.rbt_org_assignments ADD COLUMN IF NOT EXISTS invite_email text;

CREATE INDEX IF NOT EXISTS idx_rbt_org_assignments_invite_email
  ON public.rbt_org_assignments(invite_email);
