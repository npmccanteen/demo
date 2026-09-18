// js/admin-auth.js
// Helper for protecting admin pages
import { auth, onAuthStateChanged, signOut } from './firebase-init.js';

/**
 * Call this at the top of every admin page.
 * If user not logged in → redirect to admin-login.html
 * Returns a Promise that resolves with the user object once authenticated.
 */
export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, user => {
      if (user) {
        resolve(user);
      } else {
        // Save current page for redirect back after login
        sessionStorage.setItem('admin_redirect', window.location.pathname.split('/').slice(-2).join('/'));
        window.location.replace('../admin-login.html');
      }
    });
  });
}

/**
 * Logout helper — signs out and redirects to login page
 */
export async function adminLogout() {
  if (!confirm('Logout করব?')) return;
  try {
    await signOut(auth);
    window.location.replace('../admin-login.html');
  } catch (e) {
    alert('Logout fail: ' + e.message);
  }
}
