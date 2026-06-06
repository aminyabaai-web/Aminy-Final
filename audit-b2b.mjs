/**
 * B2B / Provider audit — all provider-facing + org-admin screens, light + dark.
 * Uses window.__setDevUser with role:'provider' and role:'admin'.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3001';
const SHOTS = '/tmp/audit-b2b';
fs.mkdirSync(SHOTS, { recursive: true });
fs.readdirSync(SHOTS).forEach(f => fs.unlinkSync(path.join(SHOTS, f)));

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let shotN = 0;
const bugs = [];
const findings = [];

async function shot(page, label) {
  const f = path.join(SHOTS, `${String(shotN++).padStart(3,'0')}-${label}.png`);
  await page.screenshot({ path: f, fullPage: true });
  return f;
}

async function contrast(page, name, mode) {
  const issues = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('h1,h2,h3,h4,p,span,button,label,a').forEach(el => {
      if (el.offsetWidth < 5 || el.offsetHeight < 5) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight + 200) return;
      const s = window.getComputedStyle(el);
      const text = el.textContent?.trim();
      if (!text || text.length < 2) return;
      const parseRGBA = str => { const m=str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); return m?[+m[1],+m[2],+m[3],m[4]!==undefined?+m[4]:1]:null; };
      const fg=parseRGBA(s.color), bg=parseRGBA(s.backgroundColor);
      if(!fg||!bg||bg[3]<0.15) return;
      const lum=([r,g,b])=>[r,g,b].reduce((a,v,i)=>{v=v/255;v=v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);return a+v*[0.2126,0.7152,0.0722][i];},0);
      const ratio=(Math.max(lum(fg),lum(bg))+0.05)/(Math.min(lum(fg),lum(bg))+0.05);
      if(ratio<2.5) res.push({text:text.substring(0,50),ratio:ratio.toFixed(2)});
    });
    return res.slice(0,6);
  });
  if(issues.length) bugs.push({screen:name,mode,items:issues});
  return issues;
}

async function dark(p) { await p.evaluate(()=>document.documentElement.classList.add('dark')); await p.waitForTimeout(350); }
async function light(p) { await p.evaluate(()=>document.documentElement.classList.remove('dark')); await p.waitForTimeout(350); }
async function nav(p, s) { await p.evaluate(s=>window.__navigateToScreen?.(s),s); await p.waitForTimeout(900); }
async function btns(p) { return p.$$eval('button,[role="button"]',bs=>bs.filter(b=>b.offsetParent!==null&&b.getBoundingClientRect().height>4).map(b=>b.textContent?.trim().replace(/\s+/g,' ').substring(0,30)||b.getAttribute('aria-label')||'').filter(Boolean)); }

async function testScreen(p, slug, screenId, label, extraChecks) {
  console.log(`\n── ${label} ──`);
  await nav(p, screenId);
  await p.waitForTimeout(900);
  const bodyText = await p.evaluate(()=>document.body.textContent?.trim().substring(0,100));
  console.log(`  Content: "${bodyText?.substring(0,80)}"`);
  await shot(p, `${slug}-light`);
  let inv = await contrast(p, label, 'light');
  let bl = await btns(p);
  console.log(`  Light: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
  console.log(`  Buttons (${bl.length}): ${bl.slice(0,8).join(' | ')}`);
  if(extraChecks) await extraChecks(p, 'light');
  await dark(p);
  await shot(p, `${slug}-dark`);
  inv = await contrast(p, label, 'dark');
  console.log(`  Dark: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
  if(extraChecks) await extraChecks(p, 'dark');
  await light(p);
}

const browser = await chromium.launch({executablePath:EXEC,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const ctx = await browser.newContext({viewport:{width:390,height:844}});
const page = await ctx.newPage();
page.setDefaultTimeout(12000);

async function bootWithUser(userOverrides) {
  await page.goto(BASE, {waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  try { const ab=await page.$('button:has-text("Accept all")'); if(ab) await ab.click({force:true}); } catch(_){}
  await page.waitForTimeout(300);
  await page.evaluate((u)=>{
    localStorage.setItem('__e2e_auth','bypass');
    window.__setDevUser?.(u);
  }, userOverrides);
  await page.waitForTimeout(600);
}

// ══════════════════════════════════════════════════════
// PART 1: PROVIDER (BCBA/clinician)
// ══════════════════════════════════════════════════════
console.log('\n=== PART 1: PROVIDER (BCBA/Clinician) ===\n');

await bootWithUser({
  id: 'dev-provider-001',
  role: 'provider',
  tier: 'pro',
  parentName: 'Dr. Sarah Kim',
  childName: '',
  relationship: 'provider',
  state: 'AZ',
  email: 'sarah.kim@aminy.ai',
  providerName: 'Sarah Kim, BCBA-D',
  hasCompletedOnboarding: true,
});

await nav(page,'provider-portal');
await page.waitForTimeout(1500);
const providerLanded = await page.evaluate(()=>document.body.textContent?.includes('Provider')||document.body.textContent?.includes('portal')||document.body.textContent?.includes('BCBA'));
console.log(`Provider session active: ${providerLanded?'✅':'⚠️'}`);

// ── PROVIDER PORTAL (hub)
await testScreen(page,'provider-portal','provider-portal','[P1] Provider Portal Hub', async(p,mode)=>{
  if(mode==='light'){
    const tabs = await p.$$eval('button[role="tab"],nav button',bs=>bs.filter(b=>b.offsetParent!==null).map(b=>b.textContent?.trim().substring(0,25)||''));
    console.log(`    Tabs: ${tabs.join(' | ')}`);
    // Try each tab
    for(const tabText of ['My Practice','Clients','Schedule','Billing','Credentialing','Claims']){
      const t = await p.$(`button:has-text("${tabText}"),button[role="tab"]:has-text("${tabText}")`);
      if(t){ await t.click({force:true}); await p.waitForTimeout(600);
        await shot(p,`provider-tab-${tabText.toLowerCase().replace(/ /g,'-')}`);
        const inv=await contrast(p,`ProviderPortal-${tabText}`,mode);
        const tBtns=await btns(p);
        console.log(`    Tab "${tabText}": ${inv.length?'❌ contrast':'✅'} | btns: ${tBtns.slice(0,5).join(' | ')}`);
      }
    }
  }
});

// ── PROVIDER ONBOARDING
await testScreen(page,'provider-onboarding','provider-onboarding','[P2] Provider Onboarding');

// ── BCBA BRIEFING
await testScreen(page,'bcba-briefing','bcba-briefing','[P3] BCBA Briefing');

// ── DATA COLLECTION
await testScreen(page,'data-collection','data-collection','[P4] Data Collection', async(p,mode)=>{
  if(mode==='light'){
    const startBtn=await p.$('button:has-text("Start"),button:has-text("New Session"),button:has-text("Record")');
    console.log(`    Start session button: ${startBtn?'✅':'⚠️ not found'}`);
  }
});

// ── TREATMENT PLAN EDITOR
await testScreen(page,'treatment-plan','treatment-plan-editor','[P5] Treatment Plan Editor', async(p,mode)=>{
  if(mode==='light'){
    const input=await p.$('textarea,input[type="text"],input[placeholder]');
    console.log(`    Text input: ${input?'✅':'⚠️ not found'}`);
  }
});

// ── SESSION PAYOUT
await testScreen(page,'session-payout','session-payout','[P6] Session Payout');

// ── PROVIDER PAYOUT SETUP
await testScreen(page,'payout-setup','provider-payout-setup','[P7] Provider Payout Setup');

// ── CLAIMS DASHBOARD
await testScreen(page,'claims-dashboard','claims-dashboard','[P8] Claims Dashboard', async(p,mode)=>{
  if(mode==='light'){
    const newClaim=await p.$('button:has-text("New Claim"),button:has-text("Submit"),button:has-text("Add")');
    console.log(`    New claim button: ${newClaim?'✅':'⚠️ not found'}`);
  }
});

// ── REFERRAL DASHBOARD
await testScreen(page,'referral-dashboard','referral-dashboard','[P9] Referral Dashboard');

// ── DENIAL WORKBENCH
await testScreen(page,'denial-workbench','denial-workbench','[P10] Denial Workbench');

// ── REVENUE DASHBOARD
await testScreen(page,'revenue-dashboard','revenue-dashboard','[P11] Revenue Dashboard');

// ── EVV DASHBOARD
await testScreen(page,'evv-dashboard','evv-dashboard','[P12] EVV Dashboard');

// ── CAREGIVER CREDENTIALING
await testScreen(page,'credentialing','caregiver-credentialing','[P13] Caregiver Credentialing');

// ── CLINICAL TEMPLATES
await testScreen(page,'clinical-templates','clinical-templates','[P14] Clinical Templates');

// ── OUTCOMES DASHBOARD (provider view)
await testScreen(page,'outcomes-provider','outcomes-dashboard','[P15] Outcomes Dashboard (Provider)');

// ── ASK BCBA (provider side)
await testScreen(page,'ask-bcba-provider','ask-bcba','[P16] Ask BCBA (Provider View)');

// ── PROVIDER REVIEWS
await testScreen(page,'provider-reviews','provider-reviews','[P17] Provider Reviews');

// ── VIDEO CALL / PRE-CALL
await testScreen(page,'pre-call','pre-call-setup','[P18] Pre-Call Setup', async(p,mode)=>{
  if(mode==='light'){
    const joinBtn=await p.$('button:has-text("Join"),button:has-text("Start Call"),button:has-text("Ready")');
    console.log(`    Join call button: ${joinBtn?'✅':'⚠️ not found'}`);
  }
});

// ══════════════════════════════════════════════════════
// PART 2: ORG ADMIN (B2B organization)
// ══════════════════════════════════════════════════════
console.log('\n\n=== PART 2: ORG ADMIN (B2B Organization) ===\n');

await bootWithUser({
  id: 'dev-orgadmin-001',
  role: 'admin',
  tier: 'pro',
  parentName: 'Marcus Johnson',
  childName: '',
  relationship: 'admin',
  state: 'AZ',
  email: 'marcus@aact-az.org',
  hasCompletedOnboarding: true,
  pilotOrganization: 'aact',
  pilotEligible: true,
});

await nav(page,'org-admin'); await page.waitForTimeout(1500);
const orgLanded=await page.evaluate(()=>document.body.textContent?.includes('Org')||document.body.textContent?.includes('Admin')||document.body.textContent?.includes('Organization'));
console.log(`Org admin session active: ${orgLanded?'✅':'⚠️'}`);

// ── ORG ADMIN DASHBOARD
await testScreen(page,'org-admin','org-admin','[O1] Org Admin Dashboard', async(p,mode)=>{
  if(mode==='light'){
    const tabs=await p.$$eval('button[role="tab"],div[role="tab"]',bs=>bs.filter(b=>b.offsetParent!==null).map(b=>b.textContent?.trim().substring(0,25)||''));
    console.log(`    Tabs: ${tabs.slice(0,8).join(' | ')}`);
    // Check key sections
    for(const section of ['Members','Seats','Billing','Invite']){
      const el=await p.$(`button:has-text("${section}"),tab:has-text("${section}"),a:has-text("${section}")`);
      console.log(`    "${section}" element: ${el?'✅':'⚠️ not found'}`);
    }
  }
});

// ── AACT PARTNER SETUP
await testScreen(page,'aact-setup','aact-partner-setup','[O2] AACT Partner Setup', async(p,mode)=>{
  if(mode==='light'){
    const inviteBtn=await p.$('button:has-text("Invite"),button:has-text("Send"),button:has-text("Bulk")');
    console.log(`    Invite/Send button: ${inviteBtn?'✅':'⚠️ not found'}`);
  }
});

// ── B2B PARTNER / SETUP
await testScreen(page,'b2b-partner','b2b-partner','[O3] B2B Partner Screen');
await testScreen(page,'b2b-setup','b2b-setup','[O4] B2B Setup Screen');

// ── AACT OPS DASHBOARD
await testScreen(page,'aact-ops','aact-ops-dashboard','[O5] AACT Ops Dashboard', async(p,mode)=>{
  if(mode==='light'){
    const bl2=await btns(p);
    console.log(`    Ops buttons: ${bl2.slice(0,8).join(' | ')}`);
  }
});

// ── PAYER DASHBOARD
await testScreen(page,'payer-dashboard','payer-dashboard','[O6] Payer Dashboard');

// ── CAREGIVER TIMESHEET (org)
await testScreen(page,'caregiver-timesheet','caregiver-timesheet','[O7] Caregiver Timesheet');

// ── CAREGIVER ENROLLMENT
await testScreen(page,'caregiver-enrollment','caregiver-enrollment','[O8] Caregiver Enrollment');

// ── PROVIDER IDENTITY VERIFICATION
await testScreen(page,'identity-verification','provider-identity-verification','[O9] Provider Identity Verification');

// ── FISCAL AGENT SUBMISSION
await testScreen(page,'fiscal-agent','fiscal-agent-submission','[O10] Fiscal Agent Submission');

// ── CARE COORDINATION
await testScreen(page,'care-coordination','care-coordination','[O11] Care Coordination');

// ══════════════════════════════════════════════════════
// PART 3: PARTNER LANDING (unauthenticated B2B entry)
// ══════════════════════════════════════════════════════
console.log('\n\n=== PART 3: PROVIDER LANDING (Unauthenticated) ===\n');
await page.goto(`${BASE}?org=aact`, {waitUntil:'networkidle'});
await page.waitForTimeout(1500);
await shot(page,'provider-landing-light');
let pInv=await contrast(page,'ProviderLanding','light');
let pBl=await btns(page);
console.log(`  Light: ${pInv.length?'❌ '+pInv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
console.log(`  Buttons: ${pBl.slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'provider-landing-dark');
pInv=await contrast(page,'ProviderLanding','dark');
console.log(`  Dark: ${pInv.length?'❌ '+pInv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
await light(page);

await nav(page,'provider-landing'); await page.waitForTimeout(1000);
await shot(page,'provider-landing-screen-light');
pInv=await contrast(page,'ProviderLandingScreen','light');
pBl=await btns(page);
console.log(`  Provider landing screen light: ${pInv.length?'❌ '+pInv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
console.log(`  Buttons: ${pBl.slice(0,8).join(' | ')}`);

await nav(page,'provider-apply'); await page.waitForTimeout(1000);
await shot(page,'provider-apply-light');
pInv=await contrast(page,'ProviderApply','light');
pBl=await btns(page);
console.log(`  Provider apply light: ${pInv.length?'❌ '+pInv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
console.log(`  Buttons: ${pBl.slice(0,8).join(' | ')}`);
await dark(page); await shot(page,'provider-apply-dark');
pInv=await contrast(page,'ProviderApply','dark');
console.log(`  Provider apply dark: ${pInv.length?'❌ '+pInv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
await light(page);

// ══════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════
console.log('\n\n=== B2B AUDIT SUMMARY ===');
console.log(`Total contrast bugs: ${bugs.length}`);
if(bugs.length){
  bugs.forEach(b=>{
    console.log(`  ❌ ${b.screen} (${b.mode})`);
    b.items.slice(0,2).forEach(i=>console.log(`     "${i.text}" — ${i.ratio}:1`));
  });
} else { console.log('  All screens: ✅ no contrast bugs'); }
console.log(`Findings: ${findings.length}`);
findings.forEach(f=>console.log(' ',f));
console.log(`\nScreenshots: ${SHOTS}/`);
await browser.close();
console.log('Done.');
