/* =========================================================================
   M&M Car Detailing — Owner Dashboard
   Password-gated, fully client-side editor for content / photos / reviews.
   Edits live in a "draft" (localStorage) with live preview, undo, and a
   Save & Publish action that pushes the draft to the public site.
   ========================================================================= */
(function () {
  "use strict";

  const STORE = {
    published: "mm_published",
    draft: "mm_draft",
    pwHash: "mm_admin_pwhash",
    pwIsDefault: "mm_admin_pw_default",
    apiKey: "mm_anthropic_key",
    orders: "mm_giftcard_orders",
    bookings: "mm_bookings",
  };
  const DEFAULT_PASSWORD = "mmdetailing2024";

  /* ---- Editable definitions -------------------------------------------- */
  const CONTENT_FIELDS = [
    { key: "hero.eyebrow", label: "Hero eyebrow", type: "text", def: "Premium Mobile Detailing In Ruskin, Florida" },
    { key: "hero.title", label: "Hero headline", type: "textarea", def: "Making your car look fresh, glossy, and road-ready again." },
    { key: "hero.text", label: "Hero paragraph", type: "textarea", def: "M&M Car Detailing delivers professional interior detailing, exterior detailing, paint correction, and ceramic coatings right to your driveway." },
    { key: "about.p1", label: "About — opening line", type: "textarea", def: "My name is Mark, and I'm the owner of M&M Detailing, proudly serving Ruskin, Florida." },
    { key: "contact.address", label: "Address", type: "text", def: "1438 Brown Mallet Pl, Ruskin, FL 33570" },
    { key: "contact.phone", label: "Phone (display text)", type: "text", def: "(813) 419-9026" },
    { key: "contact.email", label: "Email", type: "text", def: "mandmcardetailing1@gmail.com" },
    { key: "contact.hours", label: "Hours", type: "text", def: "Open 24 hours" },
  ];

  const PHOTO_FIELDS = [
    { key: "hero.bg", label: "Hero background", def: "../IMG_6921_Original.jpg" },
    { key: "about.1", label: "About photo (left)", def: "../IMG_7748.JPEG" },
    { key: "about.2", label: "About photo (right)", def: "../IMG_7751.JPEG" },
    { key: "gallery.0", label: "Gallery 1 (feature)", def: "../IMG_6921_Original.jpg" },
    { key: "gallery.1", label: "Gallery 2", def: "../IMG_4001.JPEG" },
    { key: "gallery.2", label: "Gallery 3", def: "../67632541764__A2BBA710-AAB0-44A9-9C4B-81418D33C028_Original.JPEG" },
    { key: "gallery.3", label: "Gallery 4", def: "../67709638408__9D85301D-5FF1-44BE-8788-363325B3556C_Original.JPEG" },
    { key: "gallery.4", label: "Gallery 5 (wide)", def: "../IMG_7052_Original.jpg" },
    { key: "gallery.5", label: "Gallery 6", def: "../IMG_4004.JPEG" },
    { key: "gallery.6", label: "Gallery 7", def: "../IMG_0357_Original.JPEG" },
    { key: "gallery.7", label: "Gallery 8 (wide)", def: "../D6B37DAC-18AE-432D-8CBC-3897DD55243E_Original.JPG" },
    { key: "gallery.8", label: "Gallery 9", def: "../08CF2466-BDCF-4B2A-A862-35CDCEF4646E_Original.JPG" },
    { key: "gallery.9", label: "Gallery 10", def: "../IMG_7494.jpg" },
    { key: "gallery.10", label: "Gallery 11", def: "../IMG_7495.jpg" },
  ];

  /* ---- State ----------------------------------------------------------- */
  let draft = { content: {}, images: {}, reviews: [] };
  let history = [];
  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));

  /* ===================== Crypto / password =============================== */
  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function ensurePassword() {
    if (!localStorage.getItem(STORE.pwHash)) {
      localStorage.setItem(STORE.pwHash, await sha256(DEFAULT_PASSWORD));
      localStorage.setItem(STORE.pwIsDefault, "1");
    }
  }

  /* ===================== Storage helpers ================================= */
  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function normalize(d) {
    return {
      content: (d && d.content) || {},
      images: (d && d.images) || {},
      reviews: (d && Array.isArray(d.reviews) ? d.reviews : []),
    };
  }

  function loadDraft() {
    const d = read(STORE.draft);
    if (d) draft = normalize(d);
    else draft = normalize(read(STORE.published));
  }

  function saveDraftToStorage() {
    try {
      localStorage.setItem(STORE.draft, JSON.stringify(draft));
      return true;
    } catch (e) {
      toast("Storage full — try a smaller image.", true);
      return false;
    }
  }

  function isDirty() {
    return JSON.stringify(draft) !== JSON.stringify(normalize(read(STORE.published)));
  }

  /* push a snapshot before mutating, so Undo can restore it */
  function pushHistory() {
    history.push(JSON.stringify(draft));
    if (history.length > 50) history.shift();
  }

  function afterChange(refresh) {
    saveDraftToStorage();
    updateBar();
    if (refresh !== false) refreshPreview();
  }

  function updateBar() {
    const dirty = isDirty();
    $("#saveBtn").disabled = !dirty;
    $("#undoBtn").disabled = history.length === 0;
    const status = $("#draftStatus");
    if (dirty) {
      status.textContent = "Unsaved changes";
      status.classList.add("dirty");
    } else {
      status.textContent = "All changes saved";
      status.classList.remove("dirty");
    }
  }

  /* ===================== Preview ======================================== */
  let previewTimer = null;
  function refreshPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const f = $("#previewFrame");
      f.contentWindow.location.reload();
    }, 400);
  }

  /* ===================== Toast ========================================== */
  let toastTimer = null;
  function toast(msg, isError) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.toggle("error", !!isError);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  /* ===================== Render: Content ================================ */
  function renderContent() {
    const wrap = $("#contentFields");
    wrap.innerHTML = "";
    CONTENT_FIELDS.forEach((f) => {
      const field = document.createElement("div");
      field.className = "edit-field";
      const val = draft.content[f.key] || "";
      const input =
        f.type === "textarea"
          ? `<textarea data-key="${f.key}" rows="3" placeholder="${escapeAttr(f.def)}">${escapeHtml(val)}</textarea>`
          : `<input type="text" data-key="${f.key}" value="${escapeAttr(val)}" placeholder="${escapeAttr(f.def)}" />`;
      field.innerHTML = `<label>${f.label}</label>${input}`;
      wrap.appendChild(field);
    });

    $$("#contentFields [data-key]").forEach((el) => {
      el.addEventListener("input", debounce(() => {
        pushHistory();
        const v = el.value.trim();
        if (v) draft.content[el.dataset.key] = v;
        else delete draft.content[el.dataset.key];
        afterChange();
      }, 350));
    });
  }

  /* ===================== Render: Photos ================================= */
  function renderPhotos() {
    const wrap = $("#photoFields");
    wrap.innerHTML = "";
    PHOTO_FIELDS.forEach((f) => {
      const src = draft.images[f.key] || f.def;
      const overridden = !!draft.images[f.key];
      const card = document.createElement("div");
      card.className = "photo-card";
      card.innerHTML = `
        <div class="photo-thumb"><img src="${src}" alt="${escapeAttr(f.label)}" /></div>
        <div class="photo-meta">
          <strong>${f.label}</strong>
          ${overridden ? '<span class="badge">Custom</span>' : ""}
        </div>
        <div class="photo-actions">
          <label class="button secondary xs">Upload
            <input type="file" accept="image/*" data-key="${f.key}" hidden />
          </label>
          ${overridden ? `<button class="link-btn" data-reset="${f.key}">Reset</button>` : ""}
        </div>`;
      wrap.appendChild(card);
    });

    $$('#photoFields input[type="file"]').forEach((inp) => {
      inp.addEventListener("change", (e) => handleUpload(e, inp.dataset.key));
    });
    $$("#photoFields [data-reset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pushHistory();
        delete draft.images[btn.dataset.reset];
        afterChange();
        renderPhotos();
      });
    });
  }

  function handleUpload(e, key) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Please choose an image file.", true);
    compressImage(file, 1600, 0.82)
      .then((dataUrl) => {
        pushHistory();
        draft.images[key] = dataUrl;
        if (saveDraftToStorage()) {
          updateBar();
          refreshPreview();
          renderPhotos();
          toast("Photo updated. Don't forget to Save & Publish.");
        } else {
          // revert if storage failed
          delete draft.images[key];
          history.pop();
        }
      })
      .catch(() => toast("Could not read that image.", true));
  }

  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ===================== Render: Reviews =============================== */
  function renderReviews() {
    const wrap = $("#reviewList");
    wrap.innerHTML = "";
    if (!draft.reviews.length) {
      wrap.innerHTML = '<p class="panel-note">No custom reviews yet. The two default reviews show until you add your own.</p>';
    }
    draft.reviews.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "review-edit";
      row.innerHTML = `
        <div class="review-edit-grid">
          <input type="text" data-i="${i}" data-f="name" value="${escapeAttr(r.name || "")}" placeholder="Customer name" />
          <input type="text" data-i="${i}" data-f="location" value="${escapeAttr(r.location || "")}" placeholder="Location (optional)" />
          <select data-i="${i}" data-f="rating">
            ${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${Number(r.rating) === n ? "selected" : ""}>${n} stars</option>`).join("")}
          </select>
        </div>
        <textarea data-i="${i}" data-f="text" rows="2" placeholder="Review text">${escapeHtml(r.text || "")}</textarea>
        <button class="link-btn danger" data-del="${i}">Delete</button>`;
      wrap.appendChild(row);
    });

    $$("#reviewList [data-f]").forEach((el) => {
      const handler = () => {
        pushHistory();
        const i = Number(el.dataset.i);
        draft.reviews[i][el.dataset.f] = el.dataset.f === "rating" ? Number(el.value) : el.value;
        afterChange();
      };
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", debounce(handler, 350));
    });
    $$("#reviewList [data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pushHistory();
        draft.reviews.splice(Number(btn.dataset.del), 1);
        afterChange();
        renderReviews();
      });
    });
  }

  /* ===================== Render: Orders ================================ */
  function renderOrders() {
    const wrap = $("#orderList");
    const orders = read(STORE.orders) || [];
    if (!orders.length) {
      wrap.innerHTML = '<p class="panel-note">No gift card orders yet.</p>';
      return;
    }
    wrap.innerHTML = orders
      .slice()
      .reverse()
      .map((o) => {
        const when = o.createdAt ? new Date(o.createdAt).toLocaleString() : "";
        return `<div class="order-card">
          <div class="order-top"><strong>${escapeHtml(o.code || "")}</strong><span>$${Number(o.total || 0).toFixed(2)}</span></div>
          <div class="order-rows">
            <span>To: ${escapeHtml(o.recipientName || "")} &lt;${escapeHtml(o.recipientEmail || "")}&gt;</span>
            <span>From: ${escapeHtml(o.senderName || "")}</span>
            ${o.deliveryDate ? `<span>Deliver: ${escapeHtml(o.deliveryDate)}</span>` : ""}
            ${o.message ? `<span>Message: ${escapeHtml(o.message)}</span>` : ""}
            <span class="order-when">${when}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  /* ===================== Render: Bookings ============================== */
  function renderBookings() {
    const wrap = $("#bookingList");
    const bookings = read(STORE.bookings) || [];
    if (!bookings.length) {
      wrap.innerHTML = '<p class="panel-note">No booking requests yet.</p>';
      return;
    }
    wrap.innerHTML = bookings
      .slice()
      .reverse()
      .map((b) => {
        const when = b.createdAt ? new Date(b.createdAt).toLocaleString() : "";
        return `<div class="order-card">
          <div class="order-top"><strong>${escapeHtml(b.ref || "")}</strong><span>${escapeHtml(b.service || "")}</span></div>
          <div class="order-rows">
            <span>Name: ${escapeHtml(b.name || "")}</span>
            <span>Phone: ${escapeHtml(b.phone || "")}</span>
            ${b.vehicle ? `<span>Vehicle: ${escapeHtml(b.vehicle)}</span>` : ""}
            ${b.date ? `<span>Preferred date: ${escapeHtml(b.date)}</span>` : ""}
            ${b.time ? `<span>Preferred time: ${escapeHtml(b.time)}</span>` : ""}
            ${b.notes ? `<span>Notes: ${escapeHtml(b.notes)}</span>` : ""}
            <span class="order-when">${when}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  /* ===================== Save / Undo / Discard ========================= */
  function publish() {
    try {
      localStorage.setItem(STORE.published, JSON.stringify(draft));
      history = [];
      updateBar();
      refreshPreview();
      toast("Published! Your live site is updated.");
    } catch (e) {
      toast("Could not save — storage full.", true);
    }
  }

  function undo() {
    if (!history.length) return;
    draft = normalize(JSON.parse(history.pop()));
    saveDraftToStorage();
    updateBar();
    refreshPreview();
    renderAll();
    toast("Reverted last change.");
  }

  function discard() {
    pushHistory();
    draft = normalize(read(STORE.published));
    saveDraftToStorage();
    history = [];
    updateBar();
    refreshPreview();
    renderAll();
    toast("Unsaved changes discarded.");
  }

  function resetAll() {
    if (!window.confirm("Remove ALL edits and restore the original website? This cannot be undone.")) return;
    localStorage.removeItem(STORE.published);
    localStorage.removeItem(STORE.draft);
    draft = { content: {}, images: {}, reviews: [] };
    history = [];
    updateBar();
    refreshPreview();
    renderAll();
    toast("Website reset to defaults.");
  }

  function renderAll() {
    renderContent();
    renderPhotos();
    renderReviews();
    renderOrders();
    renderBookings();
  }

  /* ===================== Tabs ========================================== */
  function setupTabs() {
    $$(".dash-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".dash-tab").forEach((t) => t.classList.remove("is-active"));
        $$(".tab-panel").forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        $(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
        if (tab.dataset.tab === "orders") renderOrders();
        if (tab.dataset.tab === "bookings") renderBookings();
      });
    });

    $$(".prev-device").forEach((b) => {
      b.addEventListener("click", () => {
        $$(".prev-device").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        $("#previewFrame").style.width = b.dataset.w;
      });
    });
  }

  /* ===================== Settings ====================================== */
  function setupSettings() {
    $("#changePwBtn").addEventListener("click", async () => {
      const v = $("#newPassword").value;
      const msg = $("#pwMsg");
      if (!v || v.length < 6) {
        showMsg(msg, "Password must be at least 6 characters.", true);
        return;
      }
      localStorage.setItem(STORE.pwHash, await sha256(v));
      localStorage.removeItem(STORE.pwIsDefault);
      $("#newPassword").value = "";
      showMsg(msg, "Password updated.");
    });

    const keyMsg = $("#keyMsg");
    const existing = localStorage.getItem(STORE.apiKey);
    if (existing) $("#apiKey").placeholder = "A key is saved (hidden)";
    $("#saveKeyBtn").addEventListener("click", () => {
      const v = $("#apiKey").value.trim();
      if (!v) return showMsg(keyMsg, "Enter a key first, or use Remove key.", true);
      localStorage.setItem(STORE.apiKey, v);
      $("#apiKey").value = "";
      $("#apiKey").placeholder = "A key is saved (hidden)";
      showMsg(keyMsg, "API key saved. The chatbot will now use live AI.");
    });
    $("#clearKeyBtn").addEventListener("click", () => {
      localStorage.removeItem(STORE.apiKey);
      $("#apiKey").value = "";
      $("#apiKey").placeholder = "sk-ant-… (leave blank to use built-in answers)";
      showMsg(keyMsg, "API key removed. Using built-in answers.");
    });

    $("#resetBtn").addEventListener("click", resetAll);
  }

  function showMsg(el, text, isError) {
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle("error", !!isError);
  }

  /* ===================== Login ========================================= */
  function showDashboard() {
    $("#loginScreen").hidden = true;
    $("#dashboard").hidden = false;
    loadDraft();
    saveDraftToStorage();
    renderAll();
    updateBar();
  }

  function setupLogin() {
    if (localStorage.getItem(STORE.pwIsDefault)) {
      const hint = $("#loginHint");
      hint.hidden = false;
      hint.textContent = "Default password: " + DEFAULT_PASSWORD + " — change it in Settings after logging in.";
    }
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = $("#loginPassword").value;
      const hash = await sha256(val);
      if (hash === localStorage.getItem(STORE.pwHash)) {
        sessionStorage.setItem("mm_admin_unlocked", "1");
        showDashboard();
      } else {
        $("#loginError").hidden = false;
        $("#loginPassword").value = "";
      }
    });
  }

  /* ===================== Utils ======================================== */
  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  /* ===================== Boot ========================================= */
  async function boot() {
    await ensurePassword();
    setupLogin();
    setupTabs();
    setupSettings();

    $("#saveBtn").addEventListener("click", publish);
    $("#undoBtn").addEventListener("click", undo);
    $("#discardBtn").addEventListener("click", discard);
    $("#refreshPreview").addEventListener("click", () => $("#previewFrame").contentWindow.location.reload());
    $("#addReview").addEventListener("click", () => {
      pushHistory();
      draft.reviews.push({ name: "", location: "", rating: 5, text: "" });
      afterChange(false);
      renderReviews();
    });
    $("#logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem("mm_admin_unlocked");
      location.reload();
    });

    if (sessionStorage.getItem("mm_admin_unlocked") === "1") {
      showDashboard();
    }
  }

  boot();
})();
