// js/notifications.js
import {
  db, collection, addDoc, getDocs, query, where, doc,
  updateDoc, deleteDoc, serverTimestamp
} from './firebase-init.js';

// ==========================================================
// OneSignal Config
// ==========================================================
const ONESIGNAL_APP_ID = "e4831469-cbc3-4a4e-b970-6332a29690e0";
const ONESIGNAL_REST_API_KEY = "os_v2_app_4sbri2olynfe5olqmmzkffuq4c6mki2rlhguwgeyaw7dmrabgthvfw6tnksg5bjsjot5ly6wti24xni5e6kddfawezw7quyucexny6q";

// ==========================================================
// Send OneSignal Push Notification
// ==========================================================
async function sendOneSignalPush({ externalIds, title, body, url, priority }) {
  if (!externalIds || externalIds.length === 0) return null;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: externalIds },
    target_channel: "push",
    headings: { en: title },
    contents: { en: body },
    priority: priority === 'urgent' ? 10 : (priority === 'high' ? 5 : 1)
  };
  if (url) payload.url = url;

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('OneSignal push failed:', data);
      return null;
    }

    console.log('✅ Push sent:', data);
    return data;
  } catch (e) {
    console.warn('Push error:', e);
    return null;
  }
}

// ==========================================================
// Create a notification (in-app + push)
// ==========================================================
export async function createNotification({
  recipientType,
  recipientId,
  type,
  title,
  body,
  link = '',
  priority = 'normal'
}) {
  try {
    // 1. Save in-app notification
    await addDoc(collection(db, 'notifications'), {
      recipientType,
      recipientId,
      type,
      title,
      body,
      link,
      priority,
      read: false,
      createdAt: serverTimestamp()
    });

    // 2. Send push notification (non-blocking)
    try {
      if (recipientType === 'student' && recipientId && recipientId !== 'ALL') {
        await sendOneSignalPush({
          externalIds: [String(recipientId)],
          title,
          body,
          url: link,
          priority
        });
      }
      // Note: Admin push requires knowing admin's External ID.
      // We don't push to admin for now — they use the in-app bell.
    } catch (pushErr) {
      console.warn('Push dispatch failed (non-blocking):', pushErr);
    }

  } catch (e) {
    console.warn('Create notification failed:', e);
  }
}

// ==========================================================
// Get notifications for a user
// ==========================================================
export async function getNotifications(recipientType, recipientId, limitCount = 100) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientType', '==', recipientType),
      where('recipientId', '==', recipientId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(0);
        const tb = b.createdAt?.toDate?.() || new Date(0);
        return tb - ta;
      })
      .slice(0, limitCount);
  } catch (e) {
    console.warn('Get notifications failed:', e);
    return [];
  }
}

// ==========================================================
// Mark / Delete
// ==========================================================
export async function markAsRead(notifId) {
  try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); }
  catch (e) { console.warn(e); }
}

export async function markAllAsRead(notifications) {
  const unread = notifications.filter(n => !n.read);
  for (const n of unread) {
    try { await updateDoc(doc(db, 'notifications', n.id), { read: true }); }
    catch (e) { console.warn(e); }
  }
}

export async function deleteNotification(notifId) {
  try { await deleteDoc(doc(db, 'notifications', notifId)); }
  catch (e) { console.warn(e); }
}

export async function deleteAllForUser(recipientType, recipientId) {
  const all = await getNotifications(recipientType, recipientId, 500);
  for (const n of all) {
    try { await deleteDoc(doc(db, 'notifications', n.id)); }
    catch (e) { console.warn(e); }
  }
}

// ==========================================================
// Icon/color per notification type
// ==========================================================
function typeConfig(type) {
  const map = {
    meal_added:        { icon: '🍽️', color: '#2c5aa0' },
    deposit:           { icon: '💰', color: '#28a745' },
    low_balance:       { icon: '⚠️', color: '#ff9800' },
    negative_balance:  { icon: '🚨', color: '#dc3545' },
    pin_reset:         { icon: '🔐', color: '#ff9800' },
    pin_setup_pending: { icon: '🔔', color: '#667eea' },
    daily_summary:     { icon: '📊', color: '#2c5aa0' },
    info:              { icon: 'ℹ️', color: '#6c757d' }
  };
  return map[type] || map.info;
}

// ==========================================================
// Relative time formatter
// ==========================================================
function timeAgo(date) {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return 'এইমাত্র';
  if (min < 60) return `${min} মিনিট আগে`;
  if (hr < 24) return `${hr} ঘণ্টা আগে`;
  if (day < 7) return `${day} দিন আগে`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ==========================================================
// Bell UI + Dropdown
// ==========================================================
export function mountNotificationBell({ recipientType, recipientId }) {
  if (document.getElementById('notifBellContainer')) return;

  const container = document.createElement('div');
  container.id = 'notifBellContainer';
  container.innerHTML = `
    <style>
      #notifBellContainer { position: fixed; top: 16px; right: 16px; z-index: 9998; font-family: 'Segoe UI', Arial, sans-serif; }
      #notifBellBtn {
        background: white; border: 1.5px solid #e0e0e0; border-radius: 50%;
        width: 48px; height: 48px; cursor: pointer; font-size: 22px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: relative;
        transition: 0.2s;
      }
      #notifBellBtn:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.15); transform: translateY(-1px); }
      #notifBadge {
        position: absolute; top: -4px; right: -4px;
        background: #dc3545; color: white; font-size: 10px; font-weight: 700;
        min-width: 20px; height: 20px; border-radius: 10px;
        display: none; align-items: center; justify-content: center;
        padding: 0 5px; border: 2px solid white;
      }
      #notifBadge.show { display: flex; }
      #notifDropdown {
        position: absolute; top: 58px; right: 0;
        background: white; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        width: 380px; max-width: calc(100vw - 32px);
        max-height: 500px; display: none; overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      #notifDropdown.show { display: flex; flex-direction: column; }
      #notifHeader {
        padding: 14px 18px; border-bottom: 1px solid #f0f0f0;
        display: flex; justify-content: space-between; align-items: center;
      }
      #notifHeader h3 { font-size: 15px; color: #2c5aa0; margin: 0; }
      #notifHeader .notif-actions { display: flex; gap: 8px; }
      #notifHeader button {
        background: none; border: none; cursor: pointer;
        font-size: 12px; color: #666; font-weight: 600;
        padding: 4px 8px; border-radius: 6px;
      }
      #notifHeader button:hover { background: #f0f7ff; color: #2c5aa0; }
      #notifList { overflow-y: auto; max-height: 440px; }
      .notif-item {
        padding: 14px 18px; border-bottom: 1px solid #f0f0f0;
        display: flex; gap: 12px; cursor: pointer; transition: 0.15s;
        align-items: flex-start;
      }
      .notif-item:hover { background: #f8f9fa; }
      .notif-item.unread { background: #f0f7ff; }
      .notif-item.unread:hover { background: #e5efff; }
      .notif-item .n-icon {
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
        background: rgba(44, 90, 160, 0.1);
      }
      .notif-item .n-content { flex: 1; min-width: 0; }
      .notif-item .n-title { font-weight: 700; font-size: 13px; color: #222; margin-bottom: 4px; }
      .notif-item .n-body { font-size: 12px; color: #555; line-height: 1.5; word-wrap: break-word; }
      .notif-item .n-time { font-size: 11px; color: #999; margin-top: 6px; }
      .notif-item .n-close {
        background: none; border: none; cursor: pointer;
        color: #ccc; font-size: 16px; padding: 2px 6px;
        flex-shrink: 0; line-height: 1;
      }
      .notif-item .n-close:hover { color: #dc3545; }
      .notif-empty {
        padding: 50px 20px; text-align: center; color: #999; font-size: 14px;
      }
      .notif-empty .big-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.4; }
      @media (max-width: 500px) {
        #notifDropdown { width: calc(100vw - 32px); right: -8px; }
      }
    </style>

    <button id="notifBellBtn" title="Notifications">
      🔔
      <span id="notifBadge">0</span>
    </button>

    <div id="notifDropdown">
      <div id="notifHeader">
        <h3>🔔 Notifications</h3>
        <div class="notif-actions">
          <button onclick="__notifMarkAllRead()">সব পড়া</button>
          <button onclick="__notifClearAll()">সব মুছুন</button>
        </div>
      </div>
      <div id="notifList"></div>
    </div>
  `;
  document.body.appendChild(container);

  const btn = document.getElementById('notifBellBtn');
  const dropdown = document.getElementById('notifDropdown');
  const listEl = document.getElementById('notifList');

  let currentNotifs = [];

  async function refresh() {
    currentNotifs = await getNotifications(recipientType, recipientId, 100);
    renderList();
    updateBadge();
  }

  function updateBadge() {
    const unreadCount = currentNotifs.filter(n => !n.read).length;
    const b = document.getElementById('notifBadge');
    if (!b) return;
    if (unreadCount > 0) {
      b.textContent = unreadCount > 99 ? '99+' : unreadCount;
      b.classList.add('show');
    } else {
      b.classList.remove('show');
    }
  }

  function renderList() {
    if (currentNotifs.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty">
          <div class="big-icon">📭</div>
          কোনো notification নেই
        </div>`;
      return;
    }

    listEl.innerHTML = currentNotifs.map(n => {
      const cfg = typeConfig(n.type);
      return `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-link="${n.link || ''}">
          <div class="n-icon" style="background: ${cfg.color}22; color: ${cfg.color};">${cfg.icon}</div>
          <div class="n-content">
            <div class="n-title">${escapeHtml(n.title || '')}</div>
            <div class="n-body">${escapeHtml(n.body || '')}</div>
            <div class="n-time">${timeAgo(n.createdAt)}</div>
          </div>
          <button class="n-close" title="Delete" onclick="event.stopPropagation(); __notifDelete('${n.id}')">✕</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.notif-item').forEach(el => {
      el.onclick = async () => {
        const id = el.dataset.id;
        const link = el.dataset.link;
        await markAsRead(id);
        await refresh();
        if (link) window.location.href = link;
      };
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  window.__notifMarkAllRead = async () => {
    await markAllAsRead(currentNotifs);
    await refresh();
  };
  window.__notifClearAll = async () => {
    if (!confirm('সব notification মুছে ফেলব?')) return;
    for (const n of currentNotifs) await deleteNotification(n.id);
    await refresh();
  };
  window.__notifDelete = async (id) => {
    await deleteNotification(id);
    await refresh();
  };

  btn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) refresh();
  };

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) dropdown.classList.remove('show');
  });

  refresh();
  setInterval(refresh, 30000);

  return { refresh };
}

// ==========================================================
// Browser Notification Permission (optional)
// ==========================================================
export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    return false;
  }
}

export function showBrowserNotification(title, body, icon = '/demo/icon.svg') {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return;

  try {
    const n = new Notification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: 'npmc-meal-' + Date.now()
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) {
    console.warn('Browser notification failed:', e);
  }
}
