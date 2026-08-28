// Anti-inspection and content protection utilities

let contentProtectionInitialized = false;

const OVERLAY_ID = '__devtools_blackout__';
const STYLE_ID = '__devtools_blackout_styles__';
const LOCK_CLASS = '__devtools-blackout-active__';
const DEVTOOLS_WIDTH_DELTA = 180;
const DEVTOOLS_HEIGHT_DELTA = 260;
const DEVTOOLS_CONFIRMATION_SAMPLES = 3;

function ensureBlackoutStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.${LOCK_CLASS},
    body.${LOCK_CLASS} {
      background: #000 !important;
      overflow: hidden !important;
    }

    body.${LOCK_CLASS} > *:not(#${OVERLAY_ID}) {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 2147483647;
      pointer-events: all;
      cursor: none;
    }
  `;

  document.head.appendChild(style);
}

let redirectInProgress = false;

async function clearNetworkAndRedirect() {
  if (redirectInProgress) return;
  redirectInProgress = true;

  try {
    if (window.stop) window.stop();
  } catch {}

  try {
    console.clear();
  } catch {}

  // Best-effort: clear caches and unregister service workers so nothing is replayed
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}

  // Force navigation to homepage, bypassing in-app routing and HTTP cache
  try {
    window.location.replace(`/?_r=${Date.now()}`);
  } catch {
    window.location.href = '/';
  }
}

function showBlackout() {
  // Repurposed: instead of blacking out, redirect to homepage immediately
  clearNetworkAndRedirect();
}

function hideBlackout() {
  document.documentElement.classList.remove(LOCK_CLASS);
  document.body.classList.remove(LOCK_CLASS);

  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
}

function detectWindowDelta() {
  const widthDelta = Math.max(0, window.outerWidth - window.innerWidth);
  const heightDelta = Math.max(0, window.outerHeight - window.innerHeight);

  return (
    widthDelta > DEVTOOLS_WIDTH_DELTA ||
    heightDelta > DEVTOOLS_HEIGHT_DELTA
  );
}

const clearConsole = () => {
  console.clear();
  console.log('%c⚠️ Stop!', 'color: red; font-size: 40px; font-weight: bold;');
  console.log('%cThis browser feature is intended for developers. Do not paste any code here.', 'font-size: 16px;');
};

export function initContentProtection() {
  if (contentProtectionInitialized || typeof window === 'undefined') return;
  contentProtectionInitialized = true;

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable common keyboard shortcuts for dev tools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      showBlackout();
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I / Cmd+Option+I (Inspect)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      showBlackout();
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J / Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      showBlackout();
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C / Cmd+Option+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      showBlackout();
      e.preventDefault();
      return false;
    }
    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      showBlackout();
      e.preventDefault();
      return false;
    }
    // Ctrl+S / Cmd+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return false;
    }
  });

  // DevTools open detection — only enable on non-touch devices.
  // Use window size delta only — console-bait/debugger tricks cause false
  // positives in environments that intercept console output.
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) {
    let devtoolsDetectionCount = 0;

    const detect = () => {
      if (detectWindowDelta()) {
        devtoolsDetectionCount += 1;
      } else {
        devtoolsDetectionCount = 0;
      }

      if (devtoolsDetectionCount >= DEVTOOLS_CONFIRMATION_SAMPLES) {
        showBlackout();
      }
    };
    detect();
    setInterval(detect, 600);
    window.addEventListener('resize', detect);
  }

  // Disable text selection and drag
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });
}
