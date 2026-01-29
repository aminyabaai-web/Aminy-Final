# HIPAA Compliance Documentation

## Aminy Health Information Protection Program

**Version:** 1.0
**Last Updated:** January 2026
**Document Owner:** Aminy Security Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scope](#2-scope)
3. [Administrative Safeguards](#3-administrative-safeguards)
4. [Physical Safeguards](#4-physical-safeguards)
5. [Technical Safeguards](#5-technical-safeguards)
6. [Organizational Requirements](#6-organizational-requirements)
7. [Policies and Procedures](#7-policies-and-procedures)
8. [Incident Response](#8-incident-response)
9. [Business Associate Agreements](#9-business-associate-agreements)
10. [Training Requirements](#10-training-requirements)
11. [Audit and Compliance](#11-audit-and-compliance)

---

## 1. Overview

Aminy is committed to protecting the privacy and security of Protected Health Information (PHI) in compliance with the Health Insurance Portability and Accountability Act (HIPAA) of 1996, the Health Information Technology for Economic and Clinical Health (HITECH) Act, and all applicable state privacy laws.

### 1.1 Purpose

This document outlines Aminy's comprehensive approach to:
- Protecting electronic Protected Health Information (ePHI)
- Ensuring data integrity and availability
- Preventing unauthorized access, use, or disclosure
- Enabling secure data sharing with authorized providers
- Maintaining compliance with HIPAA Security and Privacy Rules

### 1.2 Definitions

| Term | Definition |
|------|------------|
| **PHI** | Protected Health Information - individually identifiable health information |
| **ePHI** | Electronic Protected Health Information |
| **Covered Entity** | Healthcare providers, health plans, healthcare clearinghouses |
| **Business Associate** | Entity that performs functions involving PHI on behalf of a covered entity |
| **Minimum Necessary** | Limiting PHI use, disclosure, or request to minimum necessary for task |

---

## 2. Scope

### 2.1 Data Types Protected

Aminy protects the following categories of health information:

| Category | Examples | Protection Level |
|----------|----------|-----------------|
| **Child Health Records** | Diagnoses, therapy notes, developmental assessments | Highest |
| **Behavioral Data** | ABC data, behavior logs, incident reports | Highest |
| **Treatment Plans** | IEP goals, ABA therapy plans, progress notes | Highest |
| **Provider Communications** | Secure messages, consultation notes | High |
| **User Account Data** | Names, emails, family relationships | High |
| **Anonymized Analytics** | Aggregate usage, anonymized outcomes | Standard |

### 2.2 Users and Roles

| Role | Access Level | PHI Access |
|------|--------------|------------|
| Parent/Caregiver | Own child's data only | Full (own) |
| Provider (BCBA/Therapist) | Assigned clients | Full (assigned) |
| Admin | All data | Full (all) |
| Support Staff | Limited | Minimal necessary |
| System | Automated processes | Encrypted only |

---

## 3. Administrative Safeguards

### 3.1 Security Management Process

#### Risk Analysis
- Conducted annually and after significant changes
- Identifies vulnerabilities in systems handling ePHI
- Documents risk levels and mitigation strategies
- Reviewed by Security Officer quarterly

#### Risk Management
```
Risk Assessment Framework:
┌─────────────────────────────────────────────────────────┐
│ 1. Identify assets containing ePHI                      │
│ 2. Identify threats and vulnerabilities                 │
│ 3. Assess current security measures                     │
│ 4. Determine likelihood of threat occurrence            │
│ 5. Determine potential impact                           │
│ 6. Assign risk rating (Critical/High/Medium/Low)        │
│ 7. Implement appropriate safeguards                     │
│ 8. Document and monitor                                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Assigned Security Responsibility

- **HIPAA Security Officer:** Responsible for implementing and maintaining security policies
- **HIPAA Privacy Officer:** Responsible for privacy policies and breach notification
- **Compliance Team:** Regular audits and training oversight

### 3.3 Workforce Security

#### Clearance Procedures
- Background checks for all employees with PHI access
- Role-based access provisioning
- Access review upon role change
- Immediate access termination upon employment end

#### Access Authorization
```
Access Request Process:
1. Manager submits access request
2. Security team reviews necessity
3. Minimum necessary access granted
4. Access logged in audit system
5. Quarterly access review
```

### 3.4 Information Access Management

- Principle of Least Privilege enforced
- Role-based access control (RBAC)
- Access granted only for specific, documented purposes
- Regular access reviews (quarterly minimum)

### 3.5 Security Awareness Training

All workforce members complete:
- Initial HIPAA training within 30 days of hire
- Annual refresher training
- Additional training upon policy changes
- Phishing awareness testing (quarterly)

---

## 4. Physical Safeguards

### 4.1 Facility Access Controls

**Cloud Infrastructure:**
- Hosted on Supabase (SOC 2 Type II certified)
- AWS infrastructure (HIPAA eligible)
- Data centers with 24/7 security
- Biometric access controls
- Video surveillance

### 4.2 Workstation Security

- Full disk encryption required
- Automatic screen lock (5 minutes)
- VPN required for remote access
- No PHI on personal devices without MDM

### 4.3 Device and Media Controls

| Device Type | Disposal Method | Documentation |
|-------------|-----------------|---------------|
| Hard Drives | NIST 800-88 wipe or destruction | Certificate of destruction |
| SSDs | Crypto-erase or destruction | Certificate of destruction |
| Mobile Devices | Factory reset + crypto-erase | Deprovisioning log |
| Paper Records | Cross-cut shredding | Shredding log |

---

## 5. Technical Safeguards

### 5.1 Access Control

#### Unique User Identification
```typescript
// Every user has a unique identifier (UUID)
interface User {
  id: string;           // UUID - unique, never reused
  email: string;        // Verified email
  role: UserRole;       // RBAC role
  mfa_enabled: boolean; // Required for providers
  last_login: Date;
  access_log: AccessLog[];
}
```

#### Automatic Logoff
- Session timeout: 30 minutes of inactivity
- Sensitive operations require re-authentication
- Configurable per organization

#### Encryption and Decryption
```
Encryption Standards:
┌─────────────────────────────────────────────────────────┐
│ Data at Rest:                                           │
│   • AES-256 encryption                                  │
│   • Key management via AWS KMS                          │
│   • Database-level encryption (Supabase)                │
│                                                         │
│ Data in Transit:                                        │
│   • TLS 1.3 required                                    │
│   • HSTS enabled                                        │
│   • Certificate pinning for mobile apps                 │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Audit Controls

#### Audit Logging
All access to PHI is logged with:
- Timestamp (UTC)
- User ID
- Action performed
- Data accessed (hashed identifiers)
- IP address
- User agent
- Success/failure status

```sql
-- Audit log table structure
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  details JSONB,
  -- Logs retained for 7 years
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Log Retention
- Audit logs: 7 years (HIPAA requirement)
- Access logs: 7 years
- System logs: 1 year
- Debug logs: 90 days (no PHI)

### 5.3 Integrity Controls

#### Data Validation
- Input validation on all fields
- Schema validation for API requests
- Data type enforcement at database level

#### Error Handling
- No PHI in error messages
- Sanitized error responses to clients
- Full details logged securely server-side

### 5.4 Transmission Security

```
Network Security Architecture:
┌─────────────────────────────────────────────────────────┐
│                    Client (Mobile/Web)                   │
│                          │                               │
│                    TLS 1.3 / HTTPS                       │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │    CDN / WAF          │                  │
│              │    (Cloudflare)       │                  │
│              └───────────┬───────────┘                  │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │    API Gateway        │                  │
│              │    (Rate limiting)    │                  │
│              └───────────┬───────────┘                  │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │    Application        │                  │
│              │    (Vercel Edge)      │                  │
│              └───────────┬───────────┘                  │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │    Database           │                  │
│              │    (Supabase/AWS)     │                  │
│              │    AES-256 encrypted  │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Authentication Requirements

| User Type | Requirements |
|-----------|--------------|
| Parents | Email + password (12+ chars) or OAuth |
| Providers | Email + password + MFA (required) |
| Admins | Email + password + MFA + IP allowlist |

#### Password Policy
- Minimum 12 characters
- Must include: uppercase, lowercase, number, special character
- Cannot match previous 12 passwords
- Expires every 90 days (providers/admins only)
- Account lockout after 5 failed attempts

---

## 6. Organizational Requirements

### 6.1 Business Associate Agreements

All third parties with PHI access must sign a BAA. Current agreements:

| Vendor | Service | BAA Status | Review Date |
|--------|---------|------------|-------------|
| Supabase | Database | Active | 2026-01 |
| Vercel | Hosting | Active | 2026-01 |
| AWS | Infrastructure | Active | 2026-01 |
| Anthropic | AI (Claude) | Active | 2026-01 |
| Stripe | Payments | Active | 2026-01 |
| Twilio | SMS/Notifications | Active | 2026-01 |

### 6.2 Policies Maintained

- Privacy Policy (public)
- Security Policy
- Data Retention Policy
- Incident Response Policy
- Business Continuity Plan
- Disaster Recovery Plan
- Workforce Sanctions Policy

---

## 7. Policies and Procedures

### 7.1 Privacy Policies

#### Minimum Necessary Standard
- PHI access limited to what's needed for job function
- Role-based access control enforces minimum necessary
- Regular audits verify compliance

#### Individual Rights
Users can:
- Access their PHI
- Request corrections
- Request accounting of disclosures
- Request restrictions on use/disclosure
- Receive confidential communications

### 7.2 Data Handling Procedures

```
PHI Handling Workflow:
┌─────────────────────────────────────────────────────────┐
│ 1. Collection                                           │
│    • Collect only necessary information                 │
│    • Obtain consent where required                      │
│    • Encrypt immediately                                │
│                                                         │
│ 2. Processing                                           │
│    • Process in encrypted environment                   │
│    • Log all access                                     │
│    • Apply minimum necessary principle                  │
│                                                         │
│ 3. Storage                                              │
│    • Store encrypted at rest                            │
│    • Regular backups (encrypted)                        │
│    • Retain per retention schedule                      │
│                                                         │
│ 4. Transmission                                         │
│    • Encrypt in transit (TLS 1.3)                       │
│    • Verify recipient authorization                     │
│    • Log all transmissions                              │
│                                                         │
│ 5. Disposal                                             │
│    • Secure deletion after retention period             │
│    • Certificate of destruction                         │
│    • Audit trail maintained                             │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Incident Response

### 8.1 Breach Notification

#### Breach Response Timeline
| Timeline | Action |
|----------|--------|
| Immediate | Contain incident, preserve evidence |
| 24 hours | Initial assessment, notify Security Officer |
| 72 hours | Complete risk assessment |
| 60 days | Notify affected individuals (if breach confirmed) |
| 60 days | Notify HHS (if >500 individuals affected) |

#### Incident Classification
| Severity | Definition | Response Time |
|----------|------------|---------------|
| Critical | Active breach, PHI exposed | Immediate |
| High | Potential breach, vulnerability exploited | 4 hours |
| Medium | Security policy violation | 24 hours |
| Low | Minor policy deviation | 72 hours |

### 8.2 Incident Response Procedure

```
Incident Response Steps:
┌─────────────────────────────────────────────────────────┐
│ 1. DETECT                                               │
│    • Automated monitoring alerts                        │
│    • User reports                                       │
│    • Security scans                                     │
│                                                         │
│ 2. CONTAIN                                              │
│    • Isolate affected systems                           │
│    • Preserve evidence                                  │
│    • Block unauthorized access                          │
│                                                         │
│ 3. INVESTIGATE                                          │
│    • Determine scope of breach                          │
│    • Identify affected individuals                      │
│    • Document findings                                  │
│                                                         │
│ 4. REMEDIATE                                            │
│    • Patch vulnerabilities                              │
│    • Update credentials                                 │
│    • Implement additional controls                      │
│                                                         │
│ 5. NOTIFY                                               │
│    • Affected individuals                               │
│    • HHS (if required)                                  │
│    • Media (if >500 in state)                          │
│                                                         │
│ 6. REVIEW                                               │
│    • Post-incident review                               │
│    • Update policies/procedures                         │
│    • Additional training if needed                      │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Business Associate Agreements

### 9.1 BAA Requirements

All Business Associates must agree to:
- Implement appropriate safeguards
- Report security incidents
- Ensure subcontractors comply
- Make PHI available for individual access
- Make PHI available for amendments
- Provide accounting of disclosures
- Make practices available to HHS
- Return or destroy PHI upon termination

### 9.2 Subcontractor Management

- All subcontractors must sign BAA
- Annual security assessments required
- Breach notification within 24 hours
- Right to audit subcontractor practices

---

## 10. Training Requirements

### 10.1 Training Program

| Training | Audience | Frequency | Duration |
|----------|----------|-----------|----------|
| HIPAA Basics | All staff | Hire + Annual | 2 hours |
| Security Awareness | All staff | Hire + Annual | 1 hour |
| PHI Handling | PHI access | Hire + Annual | 2 hours |
| Incident Response | Security team | Quarterly | 1 hour |
| Provider Training | BCBAs, Therapists | Initial | 3 hours |

### 10.2 Training Documentation

- Training completion tracked in LMS
- Certificates issued upon completion
- Records retained for 6 years
- Non-compliance escalated to management

---

## 11. Audit and Compliance

### 11.1 Internal Audits

| Audit Type | Frequency | Scope |
|------------|-----------|-------|
| Access Review | Quarterly | All PHI access |
| Security Assessment | Annual | All systems |
| Policy Review | Annual | All policies |
| Penetration Testing | Annual | External systems |
| Vendor Assessment | Annual | All BAA vendors |

### 11.2 Compliance Monitoring

```
Continuous Monitoring:
┌─────────────────────────────────────────────────────────┐
│ • Real-time access monitoring                           │
│ • Automated policy enforcement                          │
│ • Anomaly detection (unusual access patterns)           │
│ • Failed login monitoring                               │
│ • Data exfiltration detection                          │
│ • Configuration drift detection                         │
└─────────────────────────────────────────────────────────┘
```

### 11.3 Compliance Certifications

| Certification | Status | Renewal |
|---------------|--------|---------|
| HIPAA Compliance | In Progress | Annual |
| SOC 2 Type II | Planned | Annual |
| HITRUST | Planned | Biennial |

---

## Appendix A: Contact Information

**Security Incidents:** security@aminy.care
**Privacy Questions:** privacy@aminy.care
**Compliance Inquiries:** compliance@aminy.care

**Emergency Hotline:** Available to authorized personnel

---

## Appendix B: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Security Team | Initial document |

---

## Appendix C: References

- HIPAA Privacy Rule (45 CFR Part 160 and Subparts A and E of Part 164)
- HIPAA Security Rule (45 CFR Part 160 and Subparts A and C of Part 164)
- HITECH Act
- NIST Cybersecurity Framework
- NIST SP 800-66 (HIPAA Security Rule Implementation Guide)

---

## Appendix D: Technical Implementation Status

**Last Updated:** January 2026

### Security Controls Implementation

| Control | Status | File/Location | Notes |
|---------|--------|---------------|-------|
| **Access Controls** | | | |
| Role-based access (RLS) | ✅ Implemented | `supabase/migrations/*.sql` | Database-level RLS policies |
| Session management | ✅ Implemented | `src/lib/security/session.ts` | Secure session handling |
| Rate limiting | ✅ Implemented | `server/rate-limiter.ts` | Per-user and global limits |
| | | | |
| **Audit Logging** | | | |
| Access audit logs | ✅ Implemented | `src/lib/audit-logger.ts` | HIPAA-compliant logging |
| Financial audit logs | ✅ Implemented | `server/audit-logger.ts` | Payment/subscription events |
| Webhook audit logs | ✅ Implemented | `server/stripe-routes.ts` | Stripe webhook events |
| Log retention (7 years) | 🟡 Configured | Supabase settings | Requires production verification |
| | | | |
| **Encryption** | | | |
| TLS 1.3 in transit | ✅ Implemented | `vercel.json` | HSTS enabled |
| AES-256 at rest | ✅ Supabase | Database level | Managed by Supabase |
| | | | |
| **Security Headers** | | | |
| Content-Security-Policy | ✅ Implemented | `vercel.json` | Prevents XSS |
| Strict-Transport-Security | ✅ Implemented | `vercel.json` | Enforces HTTPS |
| X-Frame-Options | ✅ Implemented | `vercel.json` | Prevents clickjacking |
| X-Content-Type-Options | ✅ Implemented | `vercel.json` | Prevents MIME sniffing |
| API security headers | ✅ Implemented | `server/index.tsx` | Edge function middleware |
| | | | |
| **Input Validation** | | | |
| Prompt injection blocking | ✅ Implemented | `server/index.tsx` | High-severity patterns blocked |
| Input sanitization | ✅ Implemented | `server/sanitize.ts` | PII scrubbing |
| Webhook HMAC validation | ✅ Implemented | `server/stripe-routes.ts` | Mandatory verification |
| | | | |
| **Monitoring** | | | |
| Error tracking (Sentry) | ✅ Implemented | `src/lib/sentry.ts` | With user context |
| Security alerts | ✅ Implemented | `server/audit-logger.ts` | Invalid signature alerts |
| | | | |
| **Authentication** | | | |
| Email/password auth | ✅ Implemented | Supabase Auth | Secure password hashing |
| OAuth (Google/Apple) | ✅ Implemented | Supabase Auth | Industry standard OAuth 2.0 |
| Password reset | ✅ Implemented | `AuthCallback.tsx` | Secure token-based reset |
| MFA for providers | ✅ Implemented | `src/lib/mfa.ts` | TOTP-based, Supabase Auth |
| MFA enrollment UI | ✅ Implemented | `MFAEnrollment.tsx` | QR code + manual entry |
| MFA verification | ✅ Implemented | `MFAVerification.tsx` | Login flow integration |
| MFA settings | ✅ Implemented | `MFASettings.tsx` | Enable/disable, backup codes |
| Server MFA enforcement | ✅ Implemented | `auth-middleware.ts` | AAL2 required for providers |
| | | | |
| **Data Protection** | | | |
| PII scrubbing in errors | ✅ Implemented | `server/sanitize.ts` | Email, phone, SSN patterns |
| Minimum necessary access | ✅ Implemented | RLS policies | Database-level enforcement |
| Data export controls | ✅ Implemented | `audit-logger.ts` | Logged with user context |

### Legend
- ✅ Implemented and tested
- 🟡 Configured but requires production verification
- 🔴 Not implemented / Planned

### Outstanding Items for Full HIPAA Compliance

1. **Business Associate Agreement (BAA)**
   - Status: Template created
   - Priority: Critical
   - Action: Execute BAAs with Supabase, Stripe, Daily.co

2. **Penetration Testing**
   - Status: Not conducted
   - Priority: High
   - Action: Schedule annual penetration test

3. **Data Retention Automation**
   - Status: Policy defined
   - Priority: Medium
   - Action: Implement automated 7-year retention with secure deletion

4. **Disaster Recovery Testing**
   - Status: DR plan documented
   - Priority: Medium
   - Action: Conduct DR drill and document results

---

*This document is confidential and intended for internal use only. Do not distribute externally without authorization from the Compliance Team.*
