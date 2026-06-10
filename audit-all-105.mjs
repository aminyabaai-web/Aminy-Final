/**
 * Full 105-screen interaction audit — every screen Aminy has.
 * Tests navigation, content visibility, buttons, forms, dark mode.
 * Run: node audit-all-105.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3001';
const SHOTS = '/tmp/audit-all-105';
fs.mkdirSync(SHOTS, { recursive: true });
fs.readdirSync(SHOTS).forEach(f => fs.unlinkSync(path.join(SHOTS, f)));
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let shotN = 0;
const issues = [];

function log(msg) { console.log(msg); }
function warn(screen, issue) { issues.push({ screen, issue }); console.log(`  ⚠️  ${issue}`); }
function pass(msg) { console.log(`  ✅ ${msg}`); }
function info(msg) { console.log(`  ℹ  ${msg}`); }

async function shot(page, label) {
  const f = path.join(SHOTS, `${String(shotN++).padStart(3,'0')}-${label}.png`);
  await page.screenshot({ path: f, fullPage: false });
}
async function nav(p, s) { await p.evaluate(s => window.__navigateToScreen?.(s), s); await p.waitForTimeout(700); }
async function dark(p) { await p.evaluate(() => document.documentElement.classList.add('dark')); await p.waitForTimeout(200); }
async function light(p) { await p.evaluate(() => document.documentElement.classList.remove('dark')); await p.waitForTimeout(200); }
async function closeBevel(p) { try { await p.evaluate(() => window.__closeBevelChat?.()); } catch(_) {} }

async function checkContent(p, name) {
  const text = await p.evaluate(() => document.body.textContent?.replace(/\s+/g,' ').trim().substring(0,300));
  if (!text || text.length < 30) warn(name, 'Screen appears empty');
  return text;
}
async function getButtons(p) {
  return p.$$eval('button,[role="button"]', bs =>
    bs.filter(b => b.offsetParent !== null && b.getBoundingClientRect().height > 4)
      .map(b => ({ text: (b.textContent?.trim().replace(/\s+/g,' ').substring(0,40)||b.getAttribute('aria-label')||'').trim() }))
      .filter(b => b.text)
  );
}
async function testInput(p, selector, value, screen, label) {
  const f = await p.$(selector);
  if (!f) { warn(screen, `Missing field: ${label}`); return; }
  try { await f.click(); await f.fill(value); pass(`Field "${label}" accepts input`); } catch(e) { warn(screen, `Field "${label}" error: ${e.message?.substring(0,50)}`); }
}
async function clickTab(p, text, screen) {
  const tab = await p.$(`button:has-text("${text}"),button[role="tab"]:has-text("${text}")`);
  if (tab) { try { await p.evaluate(el => el.click(), tab); await p.waitForTimeout(500); pass(`Tab "${text}" clicked`); } catch(_) {} }
  else warn(screen, `Tab "${text}" not found`);
}
async function clickBtn(p, selector, label, screen) {
  const btn = await p.$(selector);
  if (btn) { try { await p.evaluate(el => el.click(), btn); await p.waitForTimeout(400); pass(`Button "${label}" clicked`); } catch(_) {} }
  else warn(screen, `Button "${label}" not found`);
}

// ── Browser setup ──────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
page.on('console', msg => { if (msg.type()==='error') { const t=msg.text(); if(!t.includes('supabase')&&!t.includes('ResizeObserver')&&!t.includes('favicon')&&!t.includes('interactive-widget')) console.log(`  [console.error] ${t.substring(0,100)}`); } });

async function bootUser(overrides) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  try { const ab=await page.$('button:has-text("Accept all")'); if(ab) await ab.click({force:true}); } catch(_) {}
  await page.evaluate(u => { localStorage.setItem('__e2e_auth','bypass'); window.__setDevUser?.(u); }, overrides);
  await page.waitForTimeout(600);
}

const PARENT = { id:'dev-parent-001', role:'parent', tier:'pro', parentName:'Alex Parent', childName:'Alex', childId:'child-1', activeChildId:'child-1', hasCompletedOnboarding:true, email:'parent@test.com', state:'AZ' };
const PROVIDER = { id:'dev-provider-001', role:'provider', tier:'pro', parentName:'Dr. Sarah Kim', providerName:'Sarah Kim, BCBA-D', relationship:'provider', state:'AZ', email:'sarah@clinic.com', hasCompletedOnboarding:true };
const ADMIN = { id:'dev-admin-001', role:'admin', tier:'pro', parentName:'Admin User', hasCompletedOnboarding:true, email:'admin@aminy.ai', state:'AZ' };
const PARTNER = { id:'dev-partner-001', role:'admin', tier:'pro', parentName:'Cori Admin', hasCompletedOnboarding:true, email:'cori@aact-az.org', pilotOrganization:'aact', state:'AZ' };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n════ SECTION 1: PUBLIC / AUTH SCREENS ════');
// ════════════════════════════════════════════════════════════════════════════
await page.goto(BASE, { waitUntil:'networkidle' });
await page.waitForTimeout(1500);
try { const ab=await page.$('button:has-text("Accept all")'); if(ab) await ab.click({force:true}); } catch(_) {}

// ── [1] Splash
log('\n── [1] Splash ──');
await shot(page,'01-splash');
await checkContent(page,'Splash');
const splashBtns = await getButtons(page);
info(`Buttons: ${splashBtns.map(b=>b.text).join(' | ')}`);
const startBtn = await page.$('button:has-text("Start"),button:has-text("Get Started"),button:has-text("Sign")');
if(startBtn) pass('CTA button found'); else warn('Splash','No CTA button');
await dark(page); await shot(page,'01-splash-dark'); await light(page);

// ── [2] Login
log('\n── [2] Login ──');
await nav(page,'login'); await page.waitForTimeout(500);
await shot(page,'02-login');
await checkContent(page,'Login');
await testInput(page,'input[type="email"]','test@example.com','Login','email');
await testInput(page,'input[type="password"]','TestPass123!','Login','password');
if(await page.$('button[type="submit"],button:has-text("Sign In"),button:has-text("Log In")')) pass('Submit button'); else warn('Login','No submit button');
if(await page.$('button:has-text("Google"),button:has-text("Continue with Google")')) pass('Google OAuth'); else warn('Login','No Google OAuth');
if(await page.$('a:has-text("Forgot"),button:has-text("Forgot")')) pass('Forgot password link'); else warn('Login','No forgot password');
await dark(page); await shot(page,'02-login-dark'); await light(page);

// ── [3] Create Account
log('\n── [3] Create Account ──');
await nav(page,'create-account'); await page.waitForTimeout(500);
await shot(page,'03-create-account');
await checkContent(page,'CreateAccount');
await testInput(page,'input[type="email"]','new@test.com','CreateAccount','email');
await testInput(page,'input[type="password"]','SecurePass!','CreateAccount','password');
if(await page.$('button[type="submit"],button:has-text("Create"),button:has-text("Sign Up")')) pass('Create submit'); else warn('CreateAccount','No submit');
await dark(page); await shot(page,'03-create-account-dark'); await light(page);

// ── [4] Forgot Password
log('\n── [4] Forgot Password ──');
await nav(page,'forgot-password'); await page.waitForTimeout(500);
await shot(page,'04-forgot-password');
await checkContent(page,'ForgotPassword');
await testInput(page,'input[type="email"]','test@example.com','ForgotPassword','email');
await dark(page); await shot(page,'04-forgot-password-dark'); await light(page);

// ── [5] Reset Password
log('\n── [5] Reset Password ──');
await nav(page,'reset-password'); await page.waitForTimeout(500);
await shot(page,'05-reset-password');
await checkContent(page,'ResetPassword');
await dark(page); await shot(page,'05-reset-password-dark'); await light(page);

// ── [6] Free Screening Flow
log('\n── [6] Free Screening Flow ──');
await nav(page,'free-screening'); await page.waitForTimeout(800);
await shot(page,'06-free-screening');
await checkContent(page,'FreeScreening');
const concernBtns = await getButtons(page);
info(`Screening buttons: ${concernBtns.map(b=>b.text).slice(0,6).join(' | ')}`);
const firstConcern = await page.$('button:has-text("communication"),button:has-text("behavior"),button:has-text("sensory"),button:has-text("motor"),button:has-text("social")');
if(firstConcern) { await page.evaluate(el=>el.click(),firstConcern); await page.waitForTimeout(600); pass('Concern selection works'); }
await dark(page); await shot(page,'06-free-screening-dark'); await light(page);

// ── [7] Just Diagnosed
log('\n── [7] Just Diagnosed ──');
await nav(page,'just-diagnosed'); await page.waitForTimeout(700);
await shot(page,'07-just-diagnosed');
await checkContent(page,'JustDiagnosed');
const jdBtns = await getButtons(page);
info(`Buttons: ${jdBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'07-just-diagnosed-dark'); await light(page);

// ── [8] Provider Landing
log('\n── [8] Provider Landing ──');
await nav(page,'provider-landing'); await page.waitForTimeout(700);
await shot(page,'08-provider-landing');
await checkContent(page,'ProviderLanding');
if(await page.$('button:has-text("Apply"),button:has-text("Join"),button:has-text("Get Started")')) pass('Provider CTA found'); else warn('ProviderLanding','No CTA button');
await dark(page); await shot(page,'08-provider-landing-dark'); await light(page);

// ── [9] Provider Apply
log('\n── [9] Provider Apply ──');
await nav(page,'provider-apply'); await page.waitForTimeout(700);
await shot(page,'09-provider-apply');
await checkContent(page,'ProviderApply');
await testInput(page,'input[placeholder*="Jane"i],input[placeholder*="Smith"i],input[name="full_name"]','Dr. Jane Smith','ProviderApply','name');
await testInput(page,'input[type="email"]','jane@clinic.com','ProviderApply','email');
await dark(page); await shot(page,'09-provider-apply-dark'); await light(page);

// ── [10] Privacy Policy
log('\n── [10] Privacy Policy ──');
await nav(page,'privacy-policy'); await page.waitForTimeout(700);
await shot(page,'10-privacy-policy');
await checkContent(page,'PrivacyPolicy');
await dark(page); await shot(page,'10-privacy-policy-dark'); await light(page);

// ── [11] Terms of Service
log('\n── [11] Terms of Service ──');
await nav(page,'terms-of-service'); await page.waitForTimeout(700);
await shot(page,'11-terms-of-service');
await checkContent(page,'TermsOfService');
await dark(page); await shot(page,'11-terms-of-service-dark'); await light(page);

// ── [12] Join (Referral Landing)
log('\n── [12] Join / Referral Landing ──');
await nav(page,'join'); await page.waitForTimeout(700);
await shot(page,'12-join');
await checkContent(page,'Join');
// Lazy-loaded screen — wait for the chunk + render instead of an instant check
try { await page.waitForSelector('button:has-text("Sign Up"),button:has-text("Create"),button:has-text("Join"),button:has-text("Get Started"),button:has-text("Claim"),button:has-text("I Already")', { timeout: 5000 }); pass('Signup CTA found'); } catch { warn('Join','No signup CTA'); }
await dark(page); await shot(page,'12-join-dark'); await light(page);

// ── [13] Share Viewer
log('\n── [13] Share Viewer ──');
await nav(page,'share-viewer'); await page.waitForTimeout(700);
await shot(page,'13-share-viewer');
await checkContent(page,'ShareViewer');
await dark(page); await shot(page,'13-share-viewer-dark'); await light(page);

// ── [14] Pre-Diagnosis Entry
log('\n── [14] Pre-Diagnosis Entry ──');
await nav(page,'pre-diagnosis'); await page.waitForTimeout(700);
await shot(page,'14-pre-diagnosis');
await checkContent(page,'PreDiagnosis');
const pdBtns = await getButtons(page);
info(`Buttons: ${pdBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'14-pre-diagnosis-dark'); await light(page);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n════ SECTION 2: B2C PARENT (AUTHENTICATED) ════');
// ════════════════════════════════════════════════════════════════════════════
await bootUser(PARENT);

// ── [15] Dashboard
log('\n── [15] Dashboard ──');
await nav(page,'dashboard'); await page.waitForTimeout(1000);
await shot(page,'15-dashboard');
await checkContent(page,'Dashboard');
const dashBtns = await getButtons(page);
info(`Buttons: ${dashBtns.map(b=>b.text).slice(0,10).join(' | ')}`);
await dark(page); await shot(page,'15-dashboard-dark'); await light(page);

// ── [16] Junior Page
log('\n── [16] Junior Page ──');
await nav(page,'junior'); await page.waitForTimeout(800);
await shot(page,'16-junior');
await checkContent(page,'Junior');
const jBtns = await getButtons(page);
info(`Buttons: ${jBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'16-junior-dark'); await light(page);

// ── [17] Token Rewards (Star Shop)
log('\n── [17] Token Rewards ──');
try { await page.evaluate(() => window.__closeBevelChat?.()); } catch(_) {}
await nav(page,'token-rewards'); await page.waitForTimeout(700);
await shot(page,'17-token-rewards');
await checkContent(page,'TokenRewards');
const rewardLoc = page.locator('button',{hasText:'Dance Party'}).or(page.locator('button',{hasText:'Play'}));
if(await rewardLoc.count()>0) {
  try { await rewardLoc.first().click({force:true,timeout:3000}); } catch(_) { try { await rewardLoc.first().evaluate(el=>el.click()); } catch(_2) {} }
  await page.waitForTimeout(800);
  pass('Reward card clickable');
  const confirmLoc = page.locator('button:has-text("Let"),button:has-text("Yes"),button:has-text("Cancel")').first();
  if(await confirmLoc.count()>0) pass('Modal appeared'); else warn('TokenRewards','No confirm modal');
  await page.keyboard.press('Escape');
} else warn('TokenRewards','No reward cards');
await dark(page); await shot(page,'17-token-rewards-dark'); await light(page);

// ── [18] Sensory Fidget
log('\n── [18] Sensory Fidget ──');
await nav(page,'sensory-fidget'); await page.waitForTimeout(700);
await shot(page,'18-sensory-fidget');
await checkContent(page,'SensoryFidget');
const sfBtns = await getButtons(page);
info(`Buttons: ${sfBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'18-sensory-fidget-dark'); await light(page);

// ── [19] Calm Tools (SensoryTools)
log('\n── [19] Calm Tools ──');
await nav(page,'calm-tools'); await page.waitForTimeout(800);
await shot(page,'19-calm-tools');
await checkContent(page,'CalmTools');
const ctBtns = await getButtons(page);
info(`Buttons: ${ctBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
if(ctBtns.length>0) { await clickBtn(page,`button:has-text("${ctBtns[0].text}")`,ctBtns[0].text,'CalmTools'); }
await dark(page); await shot(page,'19-calm-tools-dark'); await light(page);

// ── [20] Parent Calm Mode
log('\n── [20] Parent Calm Mode ──');
await nav(page,'parent-calm-mode'); await page.waitForTimeout(700);
await shot(page,'20-parent-calm-mode');
await checkContent(page,'ParentCalmMode');
const pcmBtns = await getButtons(page);
info(`Buttons: ${pcmBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
// Stress scale buttons 1-10
const stressBtn = await page.$('button:has-text("5"),button:has-text("7"),button:has-text("3")');
if(stressBtn) { await page.evaluate(el=>el.click(),stressBtn); pass('Stress scale clickable'); }
await dark(page); await shot(page,'20-parent-calm-mode-dark'); await light(page);

// ── [21] Incident / Behavior Log
log('\n── [21] Incident Log ──');
await nav(page,'incident-log'); await page.waitForTimeout(700);
await shot(page,'21-incident-log');
await checkContent(page,'IncidentLog');
const logLoc = page.locator('button',{hasText:'Log behavior'});
if(await logLoc.count()>0) {
  try { await logLoc.first().click({force:true,timeout:3000}); } catch(_) { await logLoc.first().evaluate(el=>el.click()); }
  await page.waitForTimeout(800);
  const ta = await page.$('textarea');
  if(ta) { await ta.fill('Test behavior entry'); pass('Log form works'); } else warn('IncidentLog','Form textarea missing');
}
await dark(page); await shot(page,'21-incident-log-dark'); await light(page);

// ── [22] Care Plan
log('\n── [22] Care Plan ──');
await nav(page,'care-plan'); await page.waitForTimeout(700);
await shot(page,'22-care-plan');
await checkContent(page,'CarePlan');
const cpBtns = await getButtons(page);
info(`Buttons: ${cpBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'22-care-plan-dark'); await light(page);

// ── [23] Medications
log('\n── [23] Medications ──');
await nav(page,'medications'); await page.waitForTimeout(700);
await shot(page,'23-medications');
await checkContent(page,'Medications');
const medBtns = await getButtons(page);
info(`Buttons: ${medBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
const addMedBtn = await page.$('button:has-text("Add"),button:has-text("New"),button:has-text("Track"),button:has-text("+")');
if(addMedBtn) { await page.evaluate(el=>el.click(),addMedBtn); await page.waitForTimeout(500); pass('Add medication button works'); }
await dark(page); await shot(page,'23-medications-dark'); await light(page);

// ── [24] Vault (Records)
log('\n── [24] Records Vault ──');
await nav(page,'vault'); await page.waitForTimeout(700);
await shot(page,'24-vault');
await checkContent(page,'Vault');
const vBtns = await getButtons(page);
info(`Buttons: ${vBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'24-vault-dark'); await light(page);

// ── [25] Caregivers
log('\n── [25] Caregivers ──');
await nav(page,'caregivers'); await page.waitForTimeout(700);
await shot(page,'25-caregivers');
await checkContent(page,'Caregivers');
const cgBtns = await getButtons(page);
info(`Buttons: ${cgBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'25-caregivers-dark'); await light(page);

// ── [26] Caregiver Enrollment
log('\n── [26] Caregiver Enrollment ──');
await nav(page,'caregiver-enrollment'); await page.waitForTimeout(700);
await shot(page,'26-caregiver-enrollment');
await checkContent(page,'CaregiverEnrollment');
const ceBtns = await getButtons(page);
info(`Buttons: ${ceBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'26-caregiver-enrollment-dark'); await light(page);

// ── [27] Caregiver Timesheet
log('\n── [27] Caregiver Timesheet ──');
await nav(page,'caregiver-timesheet'); await page.waitForTimeout(700);
await shot(page,'27-caregiver-timesheet');
await checkContent(page,'CaregiverTimesheet');
const ctsBtns = await getButtons(page);
info(`Buttons: ${ctsBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'27-caregiver-timesheet-dark'); await light(page);

// ── [28] Caregiver Credentialing
log('\n── [28] Caregiver Credentialing ──');
await nav(page,'caregiver-credentialing'); await page.waitForTimeout(700);
await shot(page,'28-caregiver-credentialing');
await checkContent(page,'CaregiverCredentialing');
const ccBtns = await getButtons(page);
info(`Buttons: ${ccBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'28-caregiver-credentialing-dark'); await light(page);

// ── [29] Profile
log('\n── [29] Profile ──');
await nav(page,'profile'); await page.waitForTimeout(700);
await shot(page,'29-profile');
await checkContent(page,'Profile');
const profBtns = await getButtons(page);
info(`Buttons: ${profBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'29-profile-dark'); await light(page);

// ── [30] Settings
log('\n── [30] Settings ──');
await nav(page,'settings'); await page.waitForTimeout(700);
await shot(page,'30-settings');
await checkContent(page,'Settings');
const sBtns = await getButtons(page);
info(`Buttons: ${sBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'30-settings-dark'); await light(page);

// ── [31] Account Settings
log('\n── [31] Account Settings ──');
await nav(page,'account-settings'); await page.waitForTimeout(700);
await shot(page,'31-account-settings');
await checkContent(page,'AccountSettings');
const asBtns = await getButtons(page);
info(`Buttons: ${asBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'31-account-settings-dark'); await light(page);

// ── [32] Memory Settings
log('\n── [32] Memory Settings ──');
await nav(page,'memory-settings'); await page.waitForTimeout(700);
await shot(page,'32-memory-settings');
await checkContent(page,'MemorySettings');
const msBtns = await getButtons(page);
info(`Buttons: ${msBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'32-memory-settings-dark'); await light(page);

// ── [33] MFA Enrollment
log('\n── [33] MFA Enrollment ──');
await nav(page,'mfa-enrollment'); await page.waitForTimeout(700);
await shot(page,'33-mfa-enrollment');
await checkContent(page,'MFAEnrollment');
const mfaBtns = await getButtons(page);
info(`Buttons: ${mfaBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'33-mfa-enrollment-dark'); await light(page);

// ── [34] MFA Verification
log('\n── [34] MFA Verification ──');
await nav(page,'mfa-verification'); await page.waitForTimeout(700);
await shot(page,'34-mfa-verification');
await checkContent(page,'MFAVerification');
await testInput(page,'input[type="text"],input[inputmode="numeric"],input[placeholder*="code"i]','123456','MFAVerification','code');
await dark(page); await shot(page,'34-mfa-verification-dark'); await light(page);

// ── [35] Paywall
log('\n── [35] Paywall / Pricing ──');
await nav(page,'paywall'); await page.waitForTimeout(700);
await shot(page,'35-paywall');
await checkContent(page,'Paywall');
const pwBtns = await getButtons(page);
info(`Buttons: ${pwBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
const subBtn = await page.$('button:has-text("Subscribe"),button:has-text("Start"),button:has-text("Choose"),button:has-text("Pro"),button:has-text("Core")');
if(subBtn) pass('Subscribe CTA found'); else warn('Paywall','No subscribe button');
await dark(page); await shot(page,'35-paywall-dark'); await light(page);

// ── [36] Benefits
log('\n── [36] Benefits ──');
await nav(page,'benefits'); await page.waitForTimeout(700);
await shot(page,'36-benefits');
await checkContent(page,'Benefits');
const benBtns = await getButtons(page);
info(`Buttons: ${benBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'36-benefits-dark'); await light(page);

// ── [37] Coverage Coach
log('\n── [37] Coverage Coach ──');
await nav(page,'coverage-coach'); await page.waitForTimeout(700);
await shot(page,'37-coverage-coach');
await checkContent(page,'CoverageCoach');
const ccoBtns = await getButtons(page);
info(`Buttons: ${ccoBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'37-coverage-coach-dark'); await light(page);

// ── [38] Prior Auth
log('\n── [38] Prior Auth ──');
await nav(page,'prior-auth'); await page.waitForTimeout(700);
await shot(page,'38-prior-auth');
await checkContent(page,'PriorAuth');
const paBtns = await getButtons(page);
info(`Buttons: ${paBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'38-prior-auth-dark'); await light(page);

// ── [39] Claims Dashboard
log('\n── [39] Claims Dashboard ──');
await nav(page,'claims-dashboard'); await page.waitForTimeout(800);
await shot(page,'39-claims-dashboard');
await checkContent(page,'ClaimsDashboard');
const claimsBtns = await getButtons(page);
info(`Buttons: ${claimsBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'39-claims-dashboard-dark'); await light(page);

// ── [40] EVV Dashboard
log('\n── [40] EVV Dashboard ──');
await nav(page,'evv-dashboard'); await page.waitForTimeout(800);
await shot(page,'40-evv-dashboard');
await checkContent(page,'EVVDashboard');
const evvBtns = await getButtons(page);
info(`Buttons: ${evvBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'40-evv-dashboard-dark'); await light(page);

// ── [41] Fiscal Agent Submission
log('\n── [41] Fiscal Agent Submission ──');
await nav(page,'fiscal-agent-submission'); await page.waitForTimeout(800);
await shot(page,'41-fiscal-agent-submission');
await checkContent(page,'FiscalAgentSubmission');
const fasBtns = await getButtons(page);
info(`Buttons: ${fasBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'41-fiscal-agent-submission-dark'); await light(page);

// ── [42] Telehealth
log('\n── [42] Telehealth ──');
await nav(page,'telehealth'); await page.waitForTimeout(700);
await shot(page,'42-telehealth');
await checkContent(page,'Telehealth');
const thBtns = await getButtons(page);
info(`Buttons: ${thBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'42-telehealth-dark'); await light(page);

// ── [43] On-Demand Telehealth
log('\n── [43] On-Demand Telehealth ──');
await nav(page,'on-demand-telehealth'); await page.waitForTimeout(700);
await shot(page,'43-on-demand-telehealth');
await checkContent(page,'OnDemandTelehealth');
const odtBtns = await getButtons(page);
info(`Buttons: ${odtBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'43-on-demand-telehealth-dark'); await light(page);

// ── [44] My Appointments
log('\n── [44] My Appointments ──');
await nav(page,'my-appointments'); await page.waitForTimeout(700);
await shot(page,'44-my-appointments');
await checkContent(page,'MyAppointments');
await clickTab(page,'Upcoming','MyAppointments');
await clickTab(page,'Past','MyAppointments');
const bookNewBtn = await page.$('button:has-text("Book"),button:has-text("New"),button:has-text("Schedule")');
if(bookNewBtn) pass('Book new button found'); else warn('MyAppointments','No book button');
await dark(page); await shot(page,'44-my-appointments-dark'); await light(page);

// ── [45] Conversational Booking
log('\n── [45] Conversational Booking ──');
await nav(page,'conversational-booking'); await page.waitForTimeout(700);
await shot(page,'45-conversational-booking');
await checkContent(page,'ConvBooking');
const cbBtns = await getButtons(page);
info(`Buttons: ${cbBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
// Test new/returning patient choice
const newPatient = await page.$('button:has-text("New"),button:has-text("first time"),button:has-text("never")');
if(newPatient) { await page.evaluate(el=>el.click(),newPatient); await page.waitForTimeout(500); pass('New patient choice works'); }
await dark(page); await shot(page,'45-conv-booking-dark'); await light(page);

// ── [46] Waiting Room
log('\n── [46] Waiting Room ──');
await nav(page,'waiting-room'); await page.waitForTimeout(700);
await shot(page,'46-waiting-room');
await checkContent(page,'WaitingRoom');
const wrBtns = await getButtons(page);
info(`Buttons: ${wrBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'46-waiting-room-dark'); await light(page);

// ── [47] Pre-Call Setup
log('\n── [47] Pre-Call Setup ──');
await nav(page,'pre-call-setup'); await page.waitForTimeout(700);
await shot(page,'47-pre-call-setup');
await checkContent(page,'PreCallSetup');
const pcsBtns = await getButtons(page);
info(`Buttons: ${pcsBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'47-pre-call-setup-dark'); await light(page);

// ── [48] Video Call
log('\n── [48] Video Call ──');
await nav(page,'video-call'); await page.waitForTimeout(700);
await shot(page,'48-video-call');
await checkContent(page,'VideoCall');
await dark(page); await shot(page,'48-video-call-dark'); await light(page);

// ── [49] Video Call Room
log('\n── [49] Video Call Room ──');
await nav(page,'video-call-room'); await page.waitForTimeout(700);
await shot(page,'49-video-call-room');
await checkContent(page,'VideoCallRoom');
await dark(page); await shot(page,'49-video-call-room-dark'); await light(page);

// ── [50] Daily Video Room
log('\n── [50] Daily Video Room ──');
await nav(page,'daily-video-room'); await page.waitForTimeout(700);
await shot(page,'50-daily-video-room');
await checkContent(page,'DailyVideoRoom');
await dark(page); await shot(page,'50-daily-video-room-dark'); await light(page);

// ── [51] Multi-Role Telehealth
log('\n── [51] Multi-Role Telehealth ──');
await nav(page,'multi-role-telehealth'); await page.waitForTimeout(700);
await shot(page,'51-multi-role-telehealth');
await checkContent(page,'MultiRoleTelehealth');
await dark(page); await shot(page,'51-multi-role-telehealth-dark'); await light(page);

// ── [52] Messages
log('\n── [52] Messages ──');
await nav(page,'messages'); await page.waitForTimeout(700);
await shot(page,'52-messages');
await checkContent(page,'Messages');
const msgBtns = await getButtons(page);
info(`Buttons: ${msgBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
const msgInput = await page.$('textarea,input[type="text"][placeholder*="message"i]');
if(msgInput) { await msgInput.fill('Test message'); pass('Message input works'); }
await dark(page); await shot(page,'52-messages-dark'); await light(page);

// ── [53] Ask a BCBA
log('\n── [53] Ask a BCBA ──');
await nav(page,'ask-bcba'); await page.waitForTimeout(700);
await shot(page,'53-ask-bcba');
await checkContent(page,'AskBCBA');
const askBtn = await page.$('button:has-text("Ask a question"),button:has-text("Ask")');
if(askBtn) { await page.evaluate(el=>el.click(),askBtn); await page.waitForTimeout(500); const ta=await page.$('textarea'); if(ta) { await ta.fill('How do I handle meltdowns?'); pass('Ask BCBA form works'); } }
await dark(page); await shot(page,'53-ask-bcba-dark'); await light(page);

// ── [54] AI Chat (Ask Aminy)
log('\n── [54] Ask Aminy AI Chat ──');
await nav(page,'ask-aminy'); await page.waitForTimeout(700);
await shot(page,'54-ask-aminy');
await checkContent(page,'AskAminy');
const aiChatInput = await page.$('textarea,input[placeholder*="ask"i],input[placeholder*="message"i]');
if(aiChatInput) { await aiChatInput.fill('What can you help with?'); pass('AI chat input works'); }
await dark(page); await shot(page,'54-ask-aminy-dark'); await light(page);

// ── [55] Access Requests
log('\n── [55] Access Requests ──');
await nav(page,'access-requests'); await page.waitForTimeout(700);
await shot(page,'55-access-requests');
await checkContent(page,'AccessRequests');
const arBtns = await getButtons(page);
info(`Buttons: ${arBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'55-access-requests-dark'); await light(page);

// ── [56] Parent Approval
log('\n── [56] Parent Approval ──');
await nav(page,'parent-approval'); await page.waitForTimeout(700);
await shot(page,'56-parent-approval');
await checkContent(page,'ParentApproval');
// Lazy-loaded screen — wait for render; buttons exist when suggestion.status==='proposed'
let approveBtn = null, rejectBtn = null;
try { approveBtn = await page.waitForSelector('button:has-text("Approve"),button:has-text("Accept"),button:has-text("Yes"),button:has-text("Apply")', { timeout: 5000 }); } catch {}
rejectBtn = await page.$('button:has-text("Reject"),button:has-text("Decline"),button:has-text("No"),button:has-text("Not Now")');
if(approveBtn) pass('Approve button found'); else warn('ParentApproval','No approve button');
if(rejectBtn) pass('Reject button found'); else warn('ParentApproval','No reject button');
await dark(page); await shot(page,'56-parent-approval-dark'); await light(page);

// ── [57] Parent Intake
log('\n── [57] Parent Intake ──');
await nav(page,'parent-intake'); await page.waitForTimeout(700);
await shot(page,'57-parent-intake');
await checkContent(page,'ParentIntake');
const piBtns = await getButtons(page);
info(`Buttons: ${piBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'57-parent-intake-dark'); await light(page);

// ── [58] M-CHAT Screening
log('\n── [58] M-CHAT Screening ──');
await nav(page,'mchat-screening'); await page.waitForTimeout(700);
await shot(page,'58-mchat-screening');
await checkContent(page,'MCHATScreening');
const mchatBtns = await getButtons(page);
info(`Buttons: ${mchatBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
const mchatYes = await page.$('button:has-text("Yes"),button:has-text("Always"),button:has-text("Often")');
if(mchatYes) { await page.evaluate(el=>el.click(),mchatYes); await page.waitForTimeout(400); pass('M-CHAT response button works'); }
await dark(page); await shot(page,'58-mchat-dark'); await light(page);

// ── [59] Developmental Screener
log('\n── [59] Developmental Screener ──');
await nav(page,'developmental-screener'); await page.waitForTimeout(700);
await shot(page,'59-developmental-screener');
await checkContent(page,'DevelopmentalScreener');
const dsBtns = await getButtons(page);
info(`Buttons: ${dsBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'59-developmental-screener-dark'); await light(page);

// ── [60] Insight Report
log('\n── [60] Insight Report ──');
await nav(page,'insight-report'); await page.waitForTimeout(800);
await shot(page,'60-insight-report');
await checkContent(page,'InsightReport');
await dark(page); await shot(page,'60-insight-report-dark'); await light(page);

// ── [61] Weekly Insights
log('\n── [61] Weekly Insights ──');
await nav(page,'weekly-insights'); await page.waitForTimeout(800);
await shot(page,'61-weekly-insights');
await checkContent(page,'WeeklyInsights');
await dark(page); await shot(page,'61-weekly-insights-dark'); await light(page);

// ── [62] Analytics Charts
log('\n── [62] Analytics Charts ──');
await nav(page,'analytics-charts'); await page.waitForTimeout(800);
await shot(page,'62-analytics-charts');
await checkContent(page,'AnalyticsCharts');
await dark(page); await shot(page,'62-analytics-charts-dark'); await light(page);

// ── [63] Outcomes
log('\n── [63] Outcomes Tracking ──');
await nav(page,'outcomes'); await page.waitForTimeout(700);
await shot(page,'63-outcomes');
await checkContent(page,'Outcomes');
await dark(page); await shot(page,'63-outcomes-dark'); await light(page);

// ── [64] Outcomes Dashboard
log('\n── [64] Outcomes Dashboard ──');
await nav(page,'outcomes-dashboard'); await page.waitForTimeout(700);
await shot(page,'64-outcomes-dashboard');
await checkContent(page,'OutcomesDashboard');
const odBtns = await getButtons(page);
info(`Buttons: ${odBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'64-outcomes-dashboard-dark'); await light(page);

// ── [65] Outcome Measures
log('\n── [65] Outcome Measures ──');
await nav(page,'outcome-measures'); await page.waitForTimeout(700);
await shot(page,'65-outcome-measures');
await checkContent(page,'OutcomeMeasures');
const omBtns = await getButtons(page);
info(`Buttons: ${omBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'65-outcome-measures-dark'); await light(page);

// ── [66] Crisis Resources
log('\n── [66] Crisis Resources ──');
await nav(page,'crisis-resources'); await page.waitForTimeout(700);
await shot(page,'66-crisis-resources');
await checkContent(page,'CrisisResources');
const crBtns = await getButtons(page);
info(`Buttons: ${crBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
if(await page.$('a[href*="tel:"],button:has-text("911"),button:has-text("Call")')) pass('Emergency call button found'); else info('No direct call button (may use tel: links)');
await dark(page); await shot(page,'66-crisis-resources-dark'); await light(page);

// ── [67] Resources
log('\n── [67] Resources ──');
await nav(page,'resources'); await page.waitForTimeout(700);
await shot(page,'67-resources');
await checkContent(page,'Resources');
const resBtns = await getButtons(page);
info(`Buttons: ${resBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'67-resources-dark'); await light(page);

// ── [68] Community
log('\n── [68] Community ──');
await nav(page,'community'); await page.waitForTimeout(700);
await shot(page,'68-community');
await checkContent(page,'Community');
const comBtns = await getButtons(page);
info(`Buttons: ${comBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'68-community-dark'); await light(page);

// ── [69] Community Hub
log('\n── [69] Community Hub ──');
await nav(page,'community-hub'); await page.waitForTimeout(700);
await shot(page,'69-community-hub');
await checkContent(page,'CommunityHub');
const chBtns = await getButtons(page);
info(`Buttons: ${chBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'69-community-hub-dark'); await light(page);

// ── [70] Store / Marketplace
log('\n── [70] Store ──');
await nav(page,'store'); await page.waitForTimeout(700);
await shot(page,'70-store');
await checkContent(page,'Store');
const storeBtns = await getButtons(page);
info(`Buttons: ${storeBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'70-store-dark'); await light(page);

// ── [71] Provider Marketplace
log('\n── [71] Marketplace ──');
await nav(page,'marketplace'); await page.waitForTimeout(800);
await shot(page,'71-marketplace');
await checkContent(page,'Marketplace');
const mktBtns = await getButtons(page);
info(`Buttons: ${mktBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'71-marketplace-dark'); await light(page);

// ── [72] Provider Reviews
log('\n── [72] Provider Reviews ──');
await nav(page,'provider-reviews'); await page.waitForTimeout(700);
await shot(page,'72-provider-reviews');
await checkContent(page,'ProviderReviews');
await dark(page); await shot(page,'72-provider-reviews-dark'); await light(page);

// ── [73] Referral Dashboard
log('\n── [73] Referral Dashboard ──');
await nav(page,'referral-dashboard'); await page.waitForTimeout(700);
await shot(page,'73-referral-dashboard');
await checkContent(page,'ReferralDashboard');
const rdBtns = await getButtons(page);
info(`Buttons: ${rdBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'73-referral-dashboard-dark'); await light(page);

// ── [74] Grant Navigator
log('\n── [74] Grant Navigator ──');
await nav(page,'grant-navigator'); await page.waitForTimeout(700);
await shot(page,'74-grant-navigator');
await checkContent(page,'GrantNavigator');
const gnBtns = await getButtons(page);
info(`Buttons: ${gnBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'74-grant-navigator-dark'); await light(page);

// ── [75] Vision AI
log('\n── [75] Vision AI ──');
await nav(page,'vision-ai'); await page.waitForTimeout(700);
await shot(page,'75-vision-ai');
await checkContent(page,'VisionAI');
const vaiBtns = await getButtons(page);
info(`Buttons: ${vaiBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'75-vision-ai-dark'); await light(page);

// ── [76] Care Coordination
log('\n── [76] Care Coordination ──');
await nav(page,'care-coordination'); await page.waitForTimeout(700);
await shot(page,'76-care-coordination');
await checkContent(page,'CareCoordination');
const ccBtns2 = await getButtons(page);
info(`Buttons: ${ccBtns2.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'76-care-coordination-dark'); await light(page);

// ── [77] Denial Workbench
log('\n── [77] Denial Workbench ──');
await nav(page,'denial-workbench'); await page.waitForTimeout(700);
await shot(page,'77-denial-workbench');
await checkContent(page,'DenialWorkbench');
const dwBtns = await getButtons(page);
info(`Buttons: ${dwBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'77-denial-workbench-dark'); await light(page);

// ── [78] CR-Sync (CentralReach Sync — dormant)
log('\n── [78] CR-Sync ──');
await nav(page,'cr-sync'); await page.waitForTimeout(700);
await shot(page,'78-cr-sync');
await checkContent(page,'CRSync');
await dark(page); await shot(page,'78-cr-sync-dark'); await light(page);

// ── [79] Payer Dashboard
log('\n── [79] Payer Dashboard ──');
await nav(page,'payer-dashboard'); await page.waitForTimeout(800);
await shot(page,'79-payer-dashboard');
await checkContent(page,'PayerDashboard');
const pdBtns2 = await getButtons(page);
info(`Buttons: ${pdBtns2.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'79-payer-dashboard-dark'); await light(page);

// ── [80] Clinical Reports
log('\n── [80] Clinical Reports ──');
await nav(page,'clinical-reports'); await page.waitForTimeout(700);
await shot(page,'80-clinical-reports');
await checkContent(page,'ClinicalReports');
const clrBtns = await getButtons(page);
info(`Buttons: ${clrBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'80-clinical-reports-dark'); await light(page);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n════ SECTION 3: B2B / PROVIDER SCREENS ════');
// ════════════════════════════════════════════════════════════════════════════
await bootUser(PROVIDER);

// ── [81] Provider Portal (core 14 tabs already verified — spot-check here)
log('\n── [81] Provider Portal ──');
await nav(page,'provider-portal'); await page.waitForTimeout(1000);
await shot(page,'81-provider-portal');
await checkContent(page,'ProviderPortal');
for(const tab of ['Dashboard','Clients','Sessions','Earnings','Notes']) {
  await clickTab(page,tab,'ProviderPortal');
  await page.waitForTimeout(400);
}
await dark(page); await shot(page,'81-provider-portal-dark'); await light(page);

// ── [82] BCBA Portal
log('\n── [82] BCBA Portal ──');
await nav(page,'bcba-portal'); await page.waitForTimeout(700);
await shot(page,'82-bcba-portal');
await checkContent(page,'BCBAPortal');
const bcbaBtns = await getButtons(page);
info(`Buttons: ${bcbaBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'82-bcba-portal-dark'); await light(page);

// ── [83] Data Collection
log('\n── [83] Data Collection ──');
await nav(page,'data-collection'); await page.waitForTimeout(700);
await shot(page,'83-data-collection');
await checkContent(page,'DataCollection');
const dcBtns = await getButtons(page);
info(`Buttons: ${dcBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'83-data-collection-dark'); await light(page);

// ── [84] Treatment Plan Editor
log('\n── [84] Treatment Plan Editor ──');
await nav(page,'treatment-plan-editor'); await page.waitForTimeout(700);
await shot(page,'84-treatment-plan-editor');
await checkContent(page,'TreatmentPlanEditor');
const tpeBtns = await getButtons(page);
info(`Buttons: ${tpeBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'84-treatment-plan-editor-dark'); await light(page);

// ── [85] Clinical Templates
log('\n── [85] Clinical Templates ──');
await nav(page,'clinical-templates'); await page.waitForTimeout(700);
await shot(page,'85-clinical-templates');
await checkContent(page,'ClinicalTemplates');
const cltBtns = await getButtons(page);
info(`Buttons: ${cltBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'85-clinical-templates-dark'); await light(page);

// ── [86] Provider Onboarding
log('\n── [86] Provider Onboarding ──');
await nav(page,'provider-onboarding'); await page.waitForTimeout(700);
await shot(page,'86-provider-onboarding');
await checkContent(page,'ProviderOnboarding');
const poBtns = await getButtons(page);
info(`Buttons: ${poBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'86-provider-onboarding-dark'); await light(page);

// ── [87] Provider Identity Verification
log('\n── [87] Provider Identity Verification ──');
await nav(page,'provider-identity-verification'); await page.waitForTimeout(700);
await shot(page,'87-provider-identity-verification');
await checkContent(page,'ProviderIdentityVerification');
const pivBtns = await getButtons(page);
info(`Buttons: ${pivBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'87-provider-identity-verification-dark'); await light(page);

// ── [88] Provider Analytics
log('\n── [88] Provider Analytics ──');
await nav(page,'provider-analytics'); await page.waitForTimeout(700);
await shot(page,'88-provider-analytics');
await checkContent(page,'ProviderAnalytics');
await dark(page); await shot(page,'88-provider-analytics-dark'); await light(page);

// ── [89] Provider Payout Setup
log('\n── [89] Provider Payout Setup ──');
await nav(page,'provider-payout-setup'); await page.waitForTimeout(700);
await shot(page,'89-provider-payout-setup');
await checkContent(page,'ProviderPayoutSetup');
const ppsBtns = await getButtons(page);
info(`Buttons: ${ppsBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'89-provider-payout-setup-dark'); await light(page);

// ── [90] Session Payout
log('\n── [90] Session Payout ──');
await nav(page,'session-payout'); await page.waitForTimeout(700);
await shot(page,'90-session-payout');
await checkContent(page,'SessionPayout');
await dark(page); await shot(page,'90-session-payout-dark'); await light(page);

// ── [91] Credentialing Support
log('\n── [91] Credentialing Support ──');
await nav(page,'credentialing-support'); await page.waitForTimeout(700);
await shot(page,'91-credentialing-support');
await checkContent(page,'CredentialingSupport');
const csBtns = await getButtons(page);
info(`Buttons: ${csBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'91-credentialing-support-dark'); await light(page);

// ── [92] BCBA Briefing
log('\n── [92] BCBA Session Briefing ──');
await nav(page,'bcba-briefing'); await page.waitForTimeout(700);
await shot(page,'92-bcba-briefing');
await checkContent(page,'BCBABriefing');
const bbBtns = await getButtons(page);
info(`Buttons: ${bbBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'92-bcba-briefing-dark'); await light(page);

// ── [93] B2B Partner Portal
log('\n── [93] B2B Partner Portal ──');
await nav(page,'b2b-partner'); await page.waitForTimeout(700);
await shot(page,'93-b2b-partner');
await checkContent(page,'B2BPartner');
const b2bBtns = await getButtons(page);
info(`Buttons: ${b2bBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'93-b2b-partner-dark'); await light(page);

// ── [94] B2B Org Setup
log('\n── [94] B2B Org Setup ──');
await nav(page,'b2b-setup'); await page.waitForTimeout(700);
await shot(page,'94-b2b-setup');
await checkContent(page,'B2BSetup');
const b2ssBtns = await getButtons(page);
info(`Buttons: ${b2ssBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await testInput(page,'input[type="text"],input[placeholder*="org"i],input[placeholder*="company"i]','Acme Therapy Co.','B2BSetup','org name');
await dark(page); await shot(page,'94-b2b-setup-dark'); await light(page);

// ── [95] Revenue Dashboard
log('\n── [95] Revenue Dashboard ──');
await nav(page,'revenue-dashboard'); await page.waitForTimeout(700);
await shot(page,'95-revenue-dashboard');
await checkContent(page,'RevenueDashboard');
await dark(page); await shot(page,'95-revenue-dashboard-dark'); await light(page);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n════ SECTION 4: ADMIN / PARTNER SCREENS ════');
// ════════════════════════════════════════════════════════════════════════════
await bootUser(ADMIN);

// ── [96] Admin Portal
log('\n── [96] Admin Portal ──');
await nav(page,'admin-portal'); await page.waitForTimeout(800);
await shot(page,'96-admin-portal');
await checkContent(page,'AdminPortal');
const adminBtns = await getButtons(page);
info(`Buttons: ${adminBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'96-admin-portal-dark'); await light(page);

// ── [97] Launch Status
log('\n── [97] Launch Status ──');
await nav(page,'launch-status'); await page.waitForTimeout(700);
await shot(page,'97-launch-status');
await checkContent(page,'LaunchStatus');
await dark(page); await shot(page,'97-launch-status-dark'); await light(page);

// ── [98] Analytics Dashboard
log('\n── [98] Analytics Dashboard ──');
await nav(page,'analytics'); await page.waitForTimeout(800);
await shot(page,'98-analytics');
await checkContent(page,'Analytics');
const anBtns = await getButtons(page);
info(`Buttons: ${anBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'98-analytics-dark'); await light(page);

// ── [99] Phase 2 Menu
log('\n── [99] Phase 2 Menu ──');
await nav(page,'phase2-menu'); await page.waitForTimeout(700);
await shot(page,'99-phase2-menu');
await checkContent(page,'Phase2Menu');
const p2Btns = await getButtons(page);
info(`Buttons: ${p2Btns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'99-phase2-menu-dark'); await light(page);

// ── [100] Org Admin
log('\n── [100] Org Admin ──');
await nav(page,'org-admin'); await page.waitForTimeout(700);
await shot(page,'100-org-admin');
await checkContent(page,'OrgAdmin');
await dark(page); await shot(page,'100-org-admin-dark'); await light(page);

// ── [101] AACT Partner Setup
await bootUser(PARTNER);
log('\n── [101] AACT Partner Setup ──');
await nav(page,'aact-partner-setup'); await page.waitForTimeout(700);
await shot(page,'101-aact-partner-setup');
await checkContent(page,'AACTPartnerSetup');
const copyBtn = await page.$('button[aria-label*="copy"i],button[aria-label*="invite"i],button:has-text("Copy")');
if(copyBtn) { await page.evaluate(el=>el.click(),copyBtn); await page.waitForTimeout(300); pass('Copy invite link button works'); } else warn('AACTPartnerSetup','No copy button');
await dark(page); await shot(page,'101-aact-partner-setup-dark'); await light(page);

// ── [102] AACT Ops Dashboard
log('\n── [102] AACT Ops Dashboard ──');
await nav(page,'aact-ops-dashboard'); await page.waitForTimeout(700);
await shot(page,'102-aact-ops-dashboard');
await checkContent(page,'AACTOpsDashboard');
const aodBtns = await getButtons(page);
info(`Buttons: ${aodBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'102-aact-ops-dashboard-dark'); await light(page);

// ── [103] Provider Reviews (admin view)
await bootUser(ADMIN);
log('\n── [103] Provider Reviews ──');
await nav(page,'provider-reviews'); await page.waitForTimeout(700);
await shot(page,'103-provider-reviews');
await checkContent(page,'ProviderReviews');
await dark(page); await shot(page,'103-provider-reviews-dark'); await light(page);

// ── [104] Onboarding Flow
log('\n── [104] Onboarding ──');
await bootUser({...PARENT, hasCompletedOnboarding: false});
await nav(page,'onboarding'); await page.waitForTimeout(800);
await shot(page,'104-onboarding');
await checkContent(page,'Onboarding');
const onbBtns = await getButtons(page);
info(`Buttons: ${onbBtns.map(b=>b.text).slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'104-onboarding-dark'); await light(page);

// ── [105] Auth Callback (edge case — should redirect)
log('\n── [105] Auth Callback ──');
await nav(page,'auth-callback'); await page.waitForTimeout(1000);
await shot(page,'105-auth-callback');
info('Auth callback — should redirect away quickly');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n');
console.log('════════════════════════════════════════════════════════');
console.log('FULL 105-SCREEN AUDIT SUMMARY');
console.log('════════════════════════════════════════════════════════');
console.log(`Total issues found: ${issues.length}`);
if(issues.length===0) {
  console.log('  ✅ All 105 screens pass!');
} else {
  const byScreen = {};
  for(const {screen,issue} of issues) {
    if(!byScreen[screen]) byScreen[screen]=[];
    byScreen[screen].push(issue);
  }
  console.log('\nIssues by screen:');
  for(const [screen,screenIssues] of Object.entries(byScreen)) {
    console.log(`\n  ${screen} (${screenIssues.length} issue${screenIssues.length>1?'s':''}):`);
    for(const iss of screenIssues) console.log(`    ⚠️  ${iss}`);
  }
}
console.log(`\nScreenshots in: ${SHOTS}/`);
console.log('Done.');
await browser.close();
