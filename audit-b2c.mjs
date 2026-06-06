/**
 * B2C Parent audit — all parent-facing screens, light + dark.
 * Uses window.__setDevUser to inject a mock parent session.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3001';
const SHOTS = '/tmp/audit-b2c';
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
    document.querySelectorAll('h1,h2,h3,h4,p,span,button,label,a,li').forEach(el => {
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
      if(ratio<2.5) res.push({text:text.substring(0,50),ratio:ratio.toFixed(2),color:s.color,bg:s.backgroundColor});
    });
    return res.slice(0,6);
  });
  if(issues.length) bugs.push({screen:name,mode,items:issues});
  return issues;
}

async function dark(p) { await p.evaluate(()=>document.documentElement.classList.add('dark')); await p.waitForTimeout(350); }
async function light(p) { await p.evaluate(()=>document.documentElement.classList.remove('dark')); await p.waitForTimeout(350); }
async function nav(p, s) { await p.evaluate(s=>window.__navigateToScreen?.(s),s); await p.waitForTimeout(800); }
async function btns(p) { return p.$$eval('button,[role="button"]',bs=>bs.filter(b=>b.offsetParent!==null&&b.getBoundingClientRect().height>4).map(b=>b.textContent?.trim().replace(/\s+/g,' ').substring(0,30)||b.getAttribute('aria-label')||'').filter(Boolean)); }

async function testScreen(p, name, screenId, label, extraChecks) {
  console.log(`\n── ${label} ──`);
  await nav(p, screenId);
  await page.waitForTimeout(900);
  const bodyText = await p.evaluate(()=>document.body.textContent?.trim().substring(0,120));
  console.log(`  Content: "${bodyText?.substring(0,80)}"`);
  await shot(p, `${name}-light`);
  let inv = await contrast(p, label, 'light');
  let bl = await btns(p);
  console.log(`  Light: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
  console.log(`  Buttons (${bl.length}): ${bl.slice(0,8).join(' | ')}`);
  if(extraChecks) await extraChecks(p, 'light');
  await dark(p);
  await shot(p, `${name}-dark`);
  inv = await contrast(p, label, 'dark');
  console.log(`  Dark: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
  if(extraChecks) await extraChecks(p, 'dark');
  await light(p);
}

const browser = await chromium.launch({executablePath:EXEC,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const ctx = await browser.newContext({viewport:{width:390,height:844}});
const page = await ctx.newPage();
page.setDefaultTimeout(12000);

// Boot + inject B2C parent session
await page.goto(BASE, {waitUntil:'networkidle'});
await page.waitForTimeout(1500);
try { const ab=await page.$('button:has-text("Accept all")'); if(ab) await ab.click({force:true}); } catch(_){}
await page.evaluate(()=>{
  localStorage.setItem('__e2e_auth','bypass');
  window.__setDevUser?.({
    id:'dev-b2c-parent-001',
    role:'parent',
    tier:'pro',
    parentName:'Jamie Chen',
    childName:'Alex',
    childAge:5,
    relationship:'parent',
    state:'AZ',
    email:'jamie@test.aminy.ai',
    hasCompletedOnboarding:true,
  });
});
await nav(page,'dashboard');
await page.waitForTimeout(1500);
const whoami = await page.evaluate(()=>document.body.textContent?.includes('Alex')||document.body.textContent?.includes('Jamie'));
console.log(`\n=== B2C PARENT AUDIT === (user injected: ${whoami?'✅':'⚠️ may not have loaded'})\n`);

// ── DASHBOARD
await testScreen(page,'dashboard','dashboard','[1] Dashboard', async (p,mode)=>{
  const navTabs = await p.$$eval('nav button,[role="navigation"] button',bs=>bs.filter(b=>b.offsetParent!==null).map(b=>b.textContent?.trim().substring(0,20)||''));
  console.log(`    Nav tabs: ${navTabs.join(' | ')}`);
  if(mode==='light'){
    const aiTab = await p.$('nav button:has-text("Aminy AI")');
    if(aiTab){ await aiTab.click({force:true}); await p.waitForTimeout(1200);
      const chatInput = await p.$('textarea');
      console.log(`    AI Chat opens from nav: ${chatInput?'✅':'❌ MISSING (no textarea)'}`);
      if(chatInput){ await chatInput.fill('Hello Aminy'); console.log(`    Chat input works: ✅`); }
      await shot(p,'dashboard-aichat-open');
      const chatBtns = await btns(p);
      console.log(`    Chat buttons: ${chatBtns.slice(0,6).join(' | ')}`);
      // Close chat
      const closeBtn = await p.$('button[aria-label*="close" i],button[aria-label*="Close" i]');
      if(closeBtn) await closeBtn.click({force:true});
      else await nav(p,'dashboard');
      await p.waitForTimeout(600);
    }
  }
});

// ── MY PLAN
await testScreen(page,'my-plan','care-plan','[2] My Plan / Care Plan');

// ── APPOINTMENTS
await testScreen(page,'appointments','my-appointments','[3] Appointments', async (p,mode)=>{
  if(mode==='light'){
    const bookBtn = await p.$('button:has-text("Book"),button:has-text("Schedule"),button:has-text("New")');
    console.log(`    Book button: ${bookBtn?'✅':'❌ MISSING'}`);
  }
});

// ── CONVERSATIONAL BOOKING (full flow)
console.log('\n── [4] ConversationalBooking — full flow ──');
await nav(page,'conversational-booking'); await page.waitForTimeout(1000);
await shot(page,'booking-step1-light');
let inv = await contrast(page,'ConvBooking-Step1','light');
let bl = await btns(page);
console.log(`  Step 1 options: ${bl.slice(0,8).join(' | ')}`);
console.log(`  Light: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
// click concern
let cb = await page.$('button:has-text("Behavior"),button:has-text("ADHD"),button:has-text("ABA")');
if(cb){ await cb.click({force:true}); await page.waitForTimeout(900);
  await shot(page,'booking-step2-binary');
  bl = await btns(page);
  console.log(`  Step 2 binary: ${bl.slice(0,6).join(' | ')}`);
  let newBtn=await page.$('button:has-text("new"),button:has-text("New concern")');
  let oldBtn=await page.$('button:has-text("ongoing"),button:has-text("Follow")');
  console.log(`  "New concern": ${newBtn?'✅':'❌'}, "Ongoing": ${oldBtn?'✅':'❌'}`);
  if(newBtn){ await newBtn.click({force:true}); await page.waitForTimeout(900);
    await shot(page,'booking-step3-pref');
    bl=await btns(page);
    console.log(`  Step 3 provider pref: ${bl.slice(0,6).join(' | ')}`);
  }
}
await dark(page); await shot(page,'booking-dark');
inv=await contrast(page,'ConvBooking','dark');
console.log(`  Dark: ${inv.length?'❌ '+inv.map(i=>`"${i.text}"(${i.ratio})`).join(', '):'✅'}`);
await light(page);

// ── BENEFITS + sub-screens
await testScreen(page,'benefits','benefits','[5] Benefits Navigator');
await testScreen(page,'coverage-coach','coverage-coach','[6] Coverage Coach');
await testScreen(page,'prior-auth','prior-auth','[7] Prior Auth');

// ── TELEHEALTH
await testScreen(page,'telehealth','telehealth','[8] Telehealth', async(p,mode)=>{
  if(mode==='light'){
    const bookBtn=await p.$('button:has-text("Book"),button:has-text("Visit"),button:has-text("Schedule")');
    console.log(`    Book visit button: ${bookBtn?'✅':'⚠️ not found (may need auth)'}`);
  }
});

// ── VAULT
await testScreen(page,'vault','vault','[9] Records Vault', async(p,mode)=>{
  if(mode==='light'){
    const addBtn=await p.$('button:has-text("Add"),button:has-text("Upload")');
    console.log(`    Add record button: ${addBtn?'✅':'❌ MISSING'}`);
  }
});

// ── MARKETPLACE
await testScreen(page,'marketplace','marketplace','[10] Marketplace');

// ── PROFILE
await testScreen(page,'profile','profile','[11] Profile', async(p,mode)=>{
  if(mode==='light'){
    const editBtn=await p.$('button:has-text("Edit")');
    console.log(`    Edit button: ${editBtn?'✅':'❌ MISSING'}`);
    const privacyBtn=await p.$('button:has-text("Privacy"),button:has-text("Settings")');
    console.log(`    Privacy/Settings button: ${privacyBtn?'✅':'❌ MISSING'}`);
  }
});

// ── ACCOUNT SETTINGS
await testScreen(page,'account-settings','account-settings','[12] Account Settings');

// ── PAYWALL / UPGRADE
await testScreen(page,'paywall','paywall','[13] Paywall / Upgrade', async(p,mode)=>{
  if(mode==='light'){
    const upgradeBtn=await p.$('button:has-text("Upgrade"),button:has-text("Core"),button:has-text("Pro")');
    console.log(`    Upgrade button: ${upgradeBtn?'✅':'❌ MISSING'}`);
  }
});

// ── CALM TOOLS / PARENT CALM MODE
await testScreen(page,'calm-tools','calm-tools','[14] Calm Tools');
await testScreen(page,'parent-calm-mode','parent-calm-mode','[15] Parent Calm Mode');

// ── BEHAVIOR LOG / INCIDENT LOG
await testScreen(page,'incident-log','incident-log','[16] Incident / Behavior Log', async(p,mode)=>{
  if(mode==='light'){
    const logBtn=await p.$('button:has-text("Log"),button:has-text("Add"),button:has-text("New")');
    console.log(`    Log behavior button: ${logBtn?'✅':'⚠️ not found'}`);
  }
});

// ── JUST DIAGNOSED
await testScreen(page,'just-diagnosed','just-diagnosed','[17] Just Diagnosed Flow');

// ── ASK BCBA
await testScreen(page,'ask-bcba','ask-bcba','[18] Ask a BCBA', async(p,mode)=>{
  if(mode==='light'){
    const input=await p.$('textarea,input[type="text"]');
    console.log(`    Message input: ${input?'✅':'❌ MISSING'}`);
  }
});

// ── MESSAGES
await testScreen(page,'messages','messages','[19] Messages');

// ── CRISIS RESOURCES
await testScreen(page,'crisis-resources','crisis-resources','[20] Crisis Resources');

// ── GRANT NAVIGATOR
await testScreen(page,'grant-navigator','grant-navigator','[21] Grant Navigator');

// ── OUTCOMES DASHBOARD
await testScreen(page,'outcomes-dashboard','outcomes-dashboard','[22] Outcomes Dashboard');

// ── WEEKLY INSIGHTS
await testScreen(page,'weekly-insights','weekly-insights','[23] Weekly Insights');

// ── DARK MODE check for "More" tab sub-screens
await testScreen(page,'resources','resources','[24] Resources');
await testScreen(page,'community','community','[25] Community');
await testScreen(page,'token-rewards','token-rewards','[26] Token Rewards');

// ── SUMMARY
console.log('\n\n=== B2C AUDIT SUMMARY ===');
console.log(`Contrast bugs: ${bugs.length}`);
if(bugs.length){ bugs.forEach(b=>{
  console.log(`  ❌ ${b.screen} (${b.mode})`);
  b.items.slice(0,2).forEach(i=>console.log(`     "${i.text}" — ${i.ratio}:1`));
});}
else console.log('  All screens: ✅ no contrast bugs');
console.log(`Findings: ${findings.length}`);
findings.forEach(f=>console.log(' ',f));
console.log(`\nScreenshots: ${SHOTS}/`);
await browser.close();
console.log('Done.');
