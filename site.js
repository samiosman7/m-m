/* =========================================================================
   M&M Car Detailing — shared site runtime
   - Applies editable content/photo overrides saved from the admin panel
   - Renders the reviews/testimonials section
   - Mobile navigation toggle + scroll-reveal animations
   - AI chatbot widget (rule-based, upgrades to live Claude when a key is set)
   ========================================================================= */
(function () {
  "use strict";

  const STORE = {
    published: "mm_published",
    draft: "mm_draft",
    apiKey: "mm_anthropic_key",
  };

  /* ---- Default testimonials (owner can replace/add via the admin panel) -- */
  const DEFAULT_REVIEWS = [
    {
      name: "Google Reviewer",
      location: "Ruskin, FL",
      rating: 5,
      text: "Mark did an incredible job on my truck inside and out. Showroom clean and he came right to my driveway. Highly recommend M&M.",
    },
    {
      name: "Verified Customer",
      location: "Sun City Center, FL",
      rating: 4,
      text: "Booked a full detail and the interior looked brand new. Professional, on time, and great attention to detail.",
    },
  ];

  /* ---- Business knowledge for the chatbot --------------------------------- */
  const BIZ = {
    name: "M&M Car Detailing",
    phone: "(813) 419-9026",
    phoneRaw: "8134199026",
    email: "mandmcardetailing1@gmail.com",
    area: "Ruskin, FL and nearby communities (Sun City Center, Apollo Beach, Wimauma, Riverview)",
    hours: "Open 24 hours — mobile service by appointment",
    services:
      "full interior detailing, exterior detailing, paint correction, and ceramic coatings",
    pricing:
      "Compact cars & sedans start at $120, midsize SUVs at $150, trucks & full-size SUVs at $180, motorcycles at $95, and luxury/exotic/classic are custom-quoted. Full pricing is on the Quote page.",
    discounts:
      "We proudly offer discounts to military members, veterans, first responders, medical personnel, and educators.",
  };

  /* ===================== Content override engine ========================== */
  function readStore(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch (e) {
      return null;
    }
  }

  // Admin preview loads pages with ?preview=draft to see unsaved edits.
  function activeData() {
    const params = new URLSearchParams(location.search);
    if (params.get("preview") === "draft") {
      return readStore(STORE.draft) || readStore(STORE.published) || {};
    }
    return readStore(STORE.published) || {};
  }

  function applyOverrides(data) {
    const content = (data && data.content) || {};
    const images = (data && data.images) || {};

    document.querySelectorAll("[data-edit]").forEach((el) => {
      const key = el.getAttribute("data-edit");
      if (content[key] != null && content[key] !== "") {
        el.textContent = content[key];
      }
    });

    document.querySelectorAll("[data-img]").forEach((el) => {
      const key = el.getAttribute("data-img");
      if (images[key]) el.setAttribute("src", images[key]);
    });
  }

  /* ========================== Reviews section ============================= */
  function stars(n) {
    const full = Math.round(Number(n) || 0);
    let out = "";
    for (let i = 1; i <= 5; i++) out += i <= full ? "★" : "☆";
    return out;
  }

  function renderReviews(data) {
    const list = document.getElementById("reviews-list");
    if (!list) return;
    const reviews =
      data && Array.isArray(data.reviews) && data.reviews.length
        ? data.reviews
        : DEFAULT_REVIEWS;

    list.innerHTML = reviews
      .map((r) => {
        const name = escapeHtml(r.name || "Customer");
        const loc = r.location ? escapeHtml(r.location) : "";
        const text = escapeHtml(r.text || "");
        return `
        <figure class="review-card reveal">
          <div class="review-stars" aria-label="${
            Math.round(Number(r.rating) || 0)
          } out of 5 stars">${stars(r.rating)}</div>
          <blockquote>${text}</blockquote>
          <figcaption>
            <strong>${name}</strong>
            ${loc ? `<span>${loc}</span>` : ""}
          </figcaption>
        </figure>`;
      })
      .join("");
    // Newly injected cards should also animate in.
    observeReveals(list.querySelectorAll(".reveal"));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ====================== Mobile nav + scroll reveal ====================== */
  function setupNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  let revealObserver = null;
  function observeReveals(nodes) {
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              revealObserver.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
    }
    nodes.forEach((n) => revealObserver.observe(n));
  }

  /* ============================== Chatbot ================================= */
  const QUICK_REPLIES = [
    "Book a service",
    "What services do you offer?",
    "How much for a full detail?",
    "What are your hours?",
    "Buy a gift card",
  ];

  /* Services the assistant can take a booking for */
  const BOOK_SERVICES = [
    "Full Interior Detailing",
    "Exterior Detailing",
    "Full Detail (Interior + Exterior)",
    "Paint Correction",
    "Ceramic Coating",
    "Not sure — recommend for me",
  ];

  function isBookingIntent(text) {
    const s = text.toLowerCase();
    if (/gift/.test(s)) return false; // "book a gift card" → gift flow
    return (
      /\b(book|booking|appointment|schedule|reserve)\b/.test(s) ||
      /set up a time|make an appointment/.test(s)
    );
  }

  function bookingFormHTML() {
    const opts = BOOK_SERVICES.map(
      (s) => '<option value="' + s + '">' + s + "</option>"
    ).join("");
    return (
      '<form class="chat-booking" novalidate>' +
      '<select name="service" aria-label="Service">' +
      '<option value="" disabled selected>Choose a service…</option>' +
      opts +
      "</select>" +
      '<input name="name" placeholder="Your name" autocomplete="name" />' +
      '<input name="phone" type="tel" placeholder="Phone number" autocomplete="tel" />' +
      '<input name="vehicle" placeholder="Vehicle (year / make / model)" />' +
      '<input name="date" type="date" aria-label="Preferred date" />' +
      '<input name="time" placeholder="Preferred time (e.g. morning)" />' +
      '<textarea name="notes" rows="2" placeholder="Anything else? (optional)"></textarea>' +
      '<button type="submit" class="chat-booking-go">Request booking</button>' +
      '<p class="chat-booking-err" role="alert" hidden></p>' +
      "</form>"
    );
  }

  function genBookingRef() {
    return (
      "MM-BK-" +
      Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01OI]/g, "X")
    );
  }

  function botReply(text) {
    const t = text.toLowerCase();
    const has = (...w) => w.some((x) => t.includes(x));

    if (has("hello", "hi ", "hey", "good morning", "good afternoon"))
      return `Hi! Welcome to ${BIZ.name}. I can help with services, pricing, booking, gift cards, and hours. What would you like to know?`;
    if (has("thank")) return "You're welcome! Anything else I can help with?";
    if (has("gift", "card", "voucher", "present"))
      return `Yes! You can buy a digital gift card in any amount on our Gift Cards page — it sends a redeemable code to the recipient by email. <a href="gift-cards/">Open Gift Cards →</a>`;
    if (has("price", "cost", "how much", "quote", "rate", "pricing"))
      return `${BIZ.pricing} You can also <a href="quote/">view full pricing</a> or call ${linkPhone()} for an exact quote.`;
    if (has("ceramic", "coating"))
      return "Ceramic coatings add durable protection and a long-lasting gloss. Pricing depends on vehicle size and prep — call us for a custom quote and we'll walk you through the options.";
    if (has("paint correction", "swirl", "scratch", "polish"))
      return "Paint correction reduces dullness, light swirls, and tired-looking paint. It starts around $350 for compact cars and is quoted by condition. Want me to point you to the Quote page?";
    if (has("interior", "seats", "carpet", "vacuum"))
      return "Our full interior detail covers seats, carpets, panels, cupholders, and touchpoints to restore comfort and freshness. Interior details start at $140.";
    if (has("exterior", "wash", "wheels", "wax", "shine"))
      return "Exterior detailing includes careful washing, trim cleanup, wheel attention, and shine work. It starts at $120 for compact cars.";
    if (has("service", "offer", "do you", "what can"))
      return `We offer ${BIZ.services}. Which one are you interested in?`;
    if (has("hour", "open", "time", "when", "appointment", "available"))
      return `${BIZ.hours}. Ready to book? Call ${linkPhone()} and we'll set a time.`;
    if (has("where", "area", "location", "come to", "mobile", "travel", "near", "address"))
      return `We're a mobile service — we come to your home, office, or wherever your vehicle is parked. We serve ${BIZ.area}.`;
    if (has("book", "schedule", "appointment", "reserve", "set up"))
      return `Easiest way to book is to call or text ${linkPhone()}. You can also reach us at <a href="mailto:${BIZ.email}">${BIZ.email}</a>.`;
    if (has("phone", "call", "number", "contact", "text", "reach", "email"))
      return `Call or text ${linkPhone()}, or email <a href="mailto:${BIZ.email}">${BIZ.email}</a>.`;
    if (has("discount", "military", "veteran", "first responder", "nurse", "teacher", "deal"))
      return BIZ.discounts + " Just mention it when you book.";
    if (has("owner", "who", "mark", "about", "experience"))
      return "M&M is owned by Mark, who has a military background and years of detailing experience going back to restoring classic cars. Discipline, precision, and attention to detail on every vehicle.";

    return `I can help with our services, pricing, hours, booking, and gift cards. For anything specific, call ${linkPhone()} or email <a href="mailto:${BIZ.email}">${BIZ.email}</a>. What would you like to know?`;
  }

  function linkPhone() {
    return `<a href="tel:${BIZ.phoneRaw}">${BIZ.phone}</a>`;
  }

  // Optional: live Claude responses when the owner saved an API key in admin.
  async function liveReply(history) {
    const key = localStorage.getItem(STORE.apiKey);
    if (!key) return null;
    const system =
      `You are the friendly assistant for ${BIZ.name}, a mobile car detailing business in ${BIZ.area}. ` +
      `Hours: ${BIZ.hours}. Phone: ${BIZ.phone}. Email: ${BIZ.email}. ` +
      `Services: ${BIZ.services}. Pricing: ${BIZ.pricing} ${BIZ.discounts} ` +
      `Be concise, warm, and helpful. Encourage booking by phone and mention the Gift Cards and Quote pages when relevant. ` +
      `Never invent prices beyond what's given — defer to a phone quote for specifics.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          system,
          messages: history,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const block = (data.content || []).find((b) => b.type === "text");
      return block ? block.text : null;
    } catch (e) {
      return null;
    }
  }

  function buildChatbot() {
    if (document.querySelector(".chat-launch")) return;

    const launch = document.createElement("button");
    launch.className = "chat-launch";
    launch.setAttribute("aria-label", "Open chat assistant");
    launch.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.2 1 4.2 2.7 5.7-.1 1-.5 2.4-1.5 3.6 1.8-.2 3.4-.9 4.6-1.7 1.3.5 2.7.7 4.2.7 5.5 0 10-3.8 10-8.6S17.5 3 12 3Z"/></svg>';

    const panel = document.createElement("section");
    panel.className = "chat-panel";
    panel.setAttribute("aria-label", "Chat assistant");
    panel.hidden = true;
    panel.innerHTML = `
      <header class="chat-head">
        <div>
          <strong>M&amp;M Assistant</strong>
          <span>Typically replies instantly</span>
        </div>
        <button class="chat-close" aria-label="Close chat">&times;</button>
      </header>
      <div class="chat-log" role="log" aria-live="polite"></div>
      <div class="chat-quick"></div>
      <form class="chat-form">
        <input type="text" class="chat-input" placeholder="Ask about pricing, hours…" autocomplete="off" aria-label="Type your message" />
        <button type="submit" class="chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 11l18-8-8 18-2-7-8-3z"/></svg>
        </button>
      </form>`;

    document.body.appendChild(launch);
    document.body.appendChild(panel);

    const log = panel.querySelector(".chat-log");
    const quick = panel.querySelector(".chat-quick");
    const form = panel.querySelector(".chat-form");
    const input = panel.querySelector(".chat-input");
    const history = [];
    let greeted = false;

    function addMsg(role, html) {
      const div = document.createElement("div");
      div.className = "chat-msg " + role;
      div.innerHTML = html;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    function renderQuick() {
      quick.innerHTML = "";
      QUICK_REPLIES.forEach((q) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chat-chip";
        b.textContent = q;
        b.addEventListener("click", () => send(q));
        quick.appendChild(b);
      });
    }

    function startBooking() {
      if (log.querySelector(".chat-booking")) {
        addMsg("bot", "Your booking form is just above — fill it in and tap <strong>Request booking</strong>. 👆");
        return;
      }
      addMsg("bot", "Happy to help you book! Fill this out and I'll prep it for M&amp;M:");
      const card = document.createElement("div");
      card.className = "chat-msg bot";
      card.innerHTML = bookingFormHTML();
      log.appendChild(card);
      log.scrollTop = log.scrollHeight;
      const form = card.querySelector(".chat-booking");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitBooking(form);
      });
    }

    function submitBooking(form) {
      const val = (n) => {
        const el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : "";
      };
      const err = form.querySelector(".chat-booking-err");
      const fail = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      const b = {
        service: val("service"),
        name: val("name"),
        phone: val("phone"),
        vehicle: val("vehicle"),
        date: val("date"),
        time: val("time"),
        notes: val("notes"),
      };
      if (!b.name) return fail("Please add your name.");
      if (b.phone.replace(/\D/g, "").length < 7) return fail("Please add a valid phone number.");
      if (!b.service) return fail("Please choose a service.");

      b.ref = genBookingRef();
      b.createdAt = new Date().toISOString();

      // Save locally so the owner can review bookings in the admin panel.
      try {
        const all = JSON.parse(localStorage.getItem("mm_bookings")) || [];
        all.push(b);
        localStorage.setItem("mm_bookings", JSON.stringify(all));
      } catch (e) {}

      form.querySelectorAll("input, select, textarea, button").forEach((el) => (el.disabled = true));

      const subject = "Booking request " + b.ref + " — " + b.service;
      const body =
        "New booking request from the website chat\n\n" +
        "Reference: " + b.ref + "\n" +
        "Service: " + b.service + "\n" +
        "Name: " + b.name + "\n" +
        "Phone: " + b.phone + "\n" +
        (b.vehicle ? "Vehicle: " + b.vehicle + "\n" : "") +
        (b.date ? "Preferred date: " + b.date + "\n" : "") +
        (b.time ? "Preferred time: " + b.time + "\n" : "") +
        (b.notes ? "Notes: " + b.notes + "\n" : "") +
        "\nPlease confirm this booking with the customer.";
      const mailto =
        "mailto:" + BIZ.email +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      addMsg(
        "bot",
        "Thanks, " + escapeHtml(b.name) + "! Your request <strong>" + b.ref +
          "</strong> for " + escapeHtml(b.service) + " is ready. Tap below to send it to M&amp;M — " +
          "we'll confirm your time by phone.<br><br>" +
          '<a class="chat-cta" href="' + mailto + '">✉ Send booking to M&amp;M</a>' +
          '<a class="chat-cta ghost" href="tel:' + BIZ.phoneRaw + '">Call to confirm</a>'
      );
      history.push({ role: "assistant", content: "Booking " + b.ref + " prepared for " + b.service + "." });
    }

    async function send(text) {
      const clean = text.trim();
      if (!clean) return;
      addMsg("user", escapeHtml(clean));
      history.push({ role: "user", content: clean });
      input.value = "";

      if (isBookingIntent(clean)) {
        startBooking();
        return;
      }

      const typing = addMsg("bot typing", "<span></span><span></span><span></span>");
      let reply = await liveReply(history);
      if (!reply) reply = botReply(clean);
      typing.remove();

      // Live replies are plain text; linkify phone/email for convenience.
      const html = /<a /.test(reply) ? reply : escapeHtml(reply);
      addMsg("bot", html);
      history.push({ role: "assistant", content: reply });
    }

    function open() {
      panel.hidden = false;
      launch.classList.add("hidden");
      if (!greeted) {
        greeted = true;
        addMsg(
          "bot",
          `Hi! 👋 I'm the ${BIZ.name} assistant. Ask me anything about our detailing services, pricing, or booking.`
        );
        renderQuick();
      }
      setTimeout(() => input.focus(), 50);
    }
    function close() {
      panel.hidden = true;
      launch.classList.remove("hidden");
    }

    launch.addEventListener("click", open);
    panel.querySelector(".chat-close").addEventListener("click", close);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send(input.value);
    });

    // Fast ways to dismiss the chat: Escape key, or tap/click anywhere outside.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) close();
    });
    document.addEventListener("pointerdown", (e) => {
      if (panel.hidden) return;
      if (panel.contains(e.target) || launch.contains(e.target)) return;
      close();
    });
  }

  /* ============================== Boot ==================================== */
  function boot() {
    const data = activeData();
    applyOverrides(data);
    renderReviews(data);
    setupNav();
    observeReveals(document.querySelectorAll(".reveal"));
    buildChatbot();

    // Footer year
    const yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Expose helpers for the admin panel (same-origin pages).
  window.MM = { STORE, DEFAULT_REVIEWS };
})();
