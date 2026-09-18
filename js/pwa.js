// js/pwa.js
// Register service worker and handle install prompt

let deferredPrompt = null;
let installButtonVisible = false;

// Register service worker
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => console.log('✅ SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// Listen for install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installButtonVisible = true;

  // Notify any listeners
  document.dispatchEvent(new CustomEvent('pwa-installable'));
  console.log('✅ PWA installable');
});

// Install button click
export async function promptInstall() {
  if (!deferredPrompt) {
    alert('আপনার browser এই app install support করছে না, অথবা আগেই install করা আছে।');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);

  deferredPrompt = null;
  installButtonVisible = false;
  document.dispatchEvent(new CustomEvent('pwa-installed'));

  return outcome === 'accepted';
}

// Check if app is already installed / running in standalone mode
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Check if install is available
export function isInstallAvailable() {
  return installButtonVisible && !isInstalled();
}

// Show a floating install button (auto-injects)
export function showInstallButton() {
  if (!isInstallAvailable()) return;

  // Check if already showing
  if (document.getElementById('pwaInstallBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'pwaInstallBtn';
  btn.innerHTML = '📱 App Install করুন';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 15px rgba(102,126,234,0.4);
    font-family: 'Segoe UI', Arial, sans-serif;
    transition: 0.3s;
  `;

  btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; };
  btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; };
  btn.onclick = async () => {
    const installed = await promptInstall();
    if (installed) btn.remove();
  };

  document.body.appendChild(btn);

  // Auto-remove after 30 seconds (user can re-trigger by reload)
  setTimeout(() => {
    if (document.getElementById('pwaInstallBtn') && !isInstallAvailable()) {
      btn.remove();
    }
  }, 30000);
}

// Auto-init
document.addEventListener('pwa-installable', () => {
  showInstallButton();
});

// Hide button if already installed
window.addEventListener('appinstalled', () => {
  console.log('✅ App installed');
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.remove();
});

// Export init
export function initPWA() {
  registerServiceWorker();
  // If already installable at load
  if (isInstallAvailable()) showInstallButton();
}
