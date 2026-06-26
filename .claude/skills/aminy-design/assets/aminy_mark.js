/* Aminy mark hydrator — converts <span class="aminy-mark">…</span>
   and <span class="aminy-compass"></span> placeholders into the
   full compass + wordmark lockup. Drop this script on any page.

   Usage:
     <span class="aminy-mark"></span>                  (compass + "aminy")
     <span class="aminy-mark size-xl"></span>
     <span class="aminy-mark size-lg reversed"></span>
     <span class="aminy-compass"></span>              (compass only)
     <span class="aminy-compass size-lg reversed"></span>
     <span class="aminy-lockup">
       <span class="aminy-mark"></span>
       <span class="tagline">Gentle guidance · Meaningful progress</span>
     </span>
*/
(function(){
  const COMPASS_SVG = `
<svg class="compass" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--aminy-mark-navy,#0D1B2A)" stroke-width="4.8"/>
  <path d="M32 32 L28.5 34 L32 7 L35.5 34 Z" fill="var(--aminy-mark-navy,#0D1B2A)"/>
  <path d="M32 32 L28.5 30 L32 57 L35.5 30 Z" fill="var(--aminy-mark-teal,#4E93A8)"/>
  <circle cx="32" cy="32" r="2.1" fill="#ffffff"/>
</svg>`.trim();

  function hydrateMark(el){
    if (el.dataset.aminyHydrated) return;
    el.dataset.aminyHydrated = "1";
    // If author supplied children (e.g. a custom tagline), respect compass-only hydration
    if (!el.querySelector('.compass')) {
      el.insertAdjacentHTML('afterbegin', COMPASS_SVG);
    }
    if (!el.querySelector('.wm')) {
      const wm = document.createElement('span');
      wm.className = 'wm';
      wm.textContent = 'aminy';
      el.appendChild(wm);
    }
  }
  function hydrateCompass(el){
    if (el.dataset.aminyHydrated) return;
    el.dataset.aminyHydrated = "1";
    if (!el.querySelector('svg')) {
      el.innerHTML = COMPASS_SVG.replace('class="compass"', 'class="compass" style="width:100%;height:100%"');
    }
  }

  function run(){
    document.querySelectorAll('.aminy-mark').forEach(hydrateMark);
    document.querySelectorAll('.aminy-compass').forEach(hydrateCompass);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Re-run for dynamically added marks
  window.hydrateAminyMarks = run;
})();
