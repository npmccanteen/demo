// js/admin-auth.js
import { auth, onAuthStateChanged, signOut } from './firebase-init.js';

function getLoginUrl() {
  const path = window.location.pathname;
  return path.includes('/admin/') ? '../admin-login.html' : 'admin-login.html';
}

function getRedirectPath() {
  const path = window.location.pathname;
  const inAdminFolder = path.includes('/admin/');
  const fileName = path.split('/').pop();
  return inAdminFolder ? `admin/${fileName}` : fileName;
}

export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, user => {
      if (user) {
        resolve(user);
      } else {
        sessionStorage.setItem('admin_redirect', getRedirectPath());
        window.location.replace(getLoginUrl());
      }
    });
  });
}

export async function adminLogout() {
  if (!confirm('Logout করব?')) return;
  try {
    await signOut(auth);
    sessionStorage.removeItem('admin_redirect');
    window.location.replace(getLoginUrl());
  } catch (e) {
    alert('Logout fail: ' + e.message);
  }
}
