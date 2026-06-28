/* Gift card purchase flow — fully client-side (static-site friendly).
   Generates a unique code, records the order locally, and hands off
   payment + delivery via a prefilled order email to the business. */
(function () {
  "use strict";

  const BIZ_EMAIL = "mandmcardetailing1@gmail.com";
  const ORDERS_KEY = "mm_giftcard_orders";

  const form = document.getElementById("giftForm");
  const confirm = document.getElementById("giftConfirm");
  const amountOptions = document.getElementById("amountOptions");
  const customAmount = document.getElementById("customAmount");
  const quantity = document.getElementById("quantity");
  const totalAmount = document.getElementById("totalAmount");
  const previewAmount = document.getElementById("previewAmount");
  const previewTo = document.getElementById("previewTo");
  const recipientName = document.getElementById("recipientName");
  const errorEl = document.getElementById("giftError");

  let amount = 100;

  function fmt(n) {
    return "$" + Number(n).toFixed(2);
  }

  function currentAmount() {
    const custom = parseFloat(customAmount.value);
    if (!isNaN(custom) && custom > 0) return custom;
    return amount;
  }

  function refresh() {
    const a = currentAmount();
    const qty = Math.max(1, parseInt(quantity.value, 10) || 1);
    totalAmount.textContent = fmt(a * qty);
    previewAmount.textContent = "$" + Math.round(a);
    const name = recipientName.value.trim();
    previewTo.textContent = name ? "For " + name : "For someone special";
  }

  amountOptions.addEventListener("click", (e) => {
    const chip = e.target.closest(".amount-chip");
    if (!chip) return;
    document.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    amount = parseFloat(chip.dataset.amount);
    customAmount.value = "";
    refresh();
  });

  customAmount.addEventListener("input", () => {
    document.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    refresh();
  });

  quantity.addEventListener("input", refresh);
  recipientName.addEventListener("input", refresh);

  function genCode() {
    const part = () =>
      Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01OI]/g, "X");
    return "MM-" + part() + "-" + part();
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const data = {
      amount: currentAmount(),
      quantity: Math.max(1, parseInt(quantity.value, 10) || 1),
      recipientName: recipientName.value.trim(),
      recipientEmail: document.getElementById("recipientEmail").value.trim(),
      senderName: document.getElementById("senderName").value.trim(),
      senderEmail: document.getElementById("senderEmail").value.trim(),
      deliveryDate: document.getElementById("deliveryDate").value,
      message: document.getElementById("message").value.trim(),
    };

    if (data.amount < 25) return showError("Please choose an amount of at least $25.");
    if (!data.recipientName) return showError("Please enter the recipient's name.");
    if (!/.+@.+\..+/.test(data.recipientEmail)) return showError("Please enter a valid recipient email.");
    if (!data.senderName) return showError("Please enter your name.");
    if (!/.+@.+\..+/.test(data.senderEmail)) return showError("Please enter a valid email for yourself.");

    const code = genCode();
    const total = data.amount * data.quantity;
    const order = Object.assign({ code: code, total: total, createdAt: new Date().toISOString() }, data);

    // Save order locally (the owner can review these in the admin panel).
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
      orders.push(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {}

    renderConfirmation(order);
  });

  function renderConfirmation(order) {
    document.getElementById("giftCode").textContent = order.code;
    document.getElementById("confirmWhen").textContent = order.deliveryDate
      ? "on " + order.deliveryDate
      : "right away";

    const details = document.getElementById("confirmDetails");
    const rows = [
      ["Amount", fmt(order.amount) + (order.quantity > 1 ? " × " + order.quantity : "")],
      ["Total", fmt(order.total)],
      ["To", order.recipientName + " (" + order.recipientEmail + ")"],
      ["From", order.senderName],
      order.deliveryDate ? ["Deliver on", order.deliveryDate] : null,
      order.message ? ["Message", order.message] : null,
    ].filter(Boolean);
    details.innerHTML = rows
      .map((r) => `<div><dt>${r[0]}</dt><dd>${escapeHtml(r[1])}</dd></div>`)
      .join("");

    // Prefilled email to the business to finalize payment + delivery.
    const subject = "Gift Card Order " + order.code + " — " + fmt(order.total);
    const body =
      "New gift card order from the website\n\n" +
      "Code: " + order.code + "\n" +
      "Amount: " + fmt(order.amount) + (order.quantity > 1 ? " x " + order.quantity : "") + "\n" +
      "Total: " + fmt(order.total) + "\n" +
      "Recipient: " + order.recipientName + " <" + order.recipientEmail + ">\n" +
      "From: " + order.senderName + " <" + order.senderEmail + ">\n" +
      (order.deliveryDate ? "Deliver on: " + order.deliveryDate + "\n" : "") +
      (order.message ? "Message: " + order.message + "\n" : "") +
      "\nPlease confirm payment and send the card to the recipient.";
    document.getElementById("emailOrder").href =
      "mailto:" + BIZ_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    form.hidden = true;
    confirm.hidden = false;
    confirm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("copyCode").addEventListener("click", function () {
    const code = document.getElementById("giftCode").textContent;
    const btn = this;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1800);
      });
    }
  });

  document.getElementById("anotherGift").addEventListener("click", () => {
    form.reset();
    amount = 100;
    document.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    document.querySelector('.amount-chip[data-amount="100"]').classList.add("is-active");
    refresh();
    confirm.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  refresh();
})();
