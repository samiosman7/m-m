const quoteCards = document.querySelectorAll(".quote-card");

for (const card of quoteCards) {
  const summary = card.querySelector("summary");
  const body = card.querySelector(".quote-card-body");

  if (!summary || !body) continue;

  if (card.open) {
    body.style.height = `${body.scrollHeight}px`;
  } else {
    body.style.height = "0px";
  }

  summary.addEventListener("click", (event) => {
    event.preventDefault();

    const isOpening = !card.open;

    if (isOpening) {
      card.open = true;
      body.style.height = "0px";

      requestAnimationFrame(() => {
        body.style.height = `${body.scrollHeight}px`;
      });
      return;
    }

    body.style.height = `${body.scrollHeight}px`;

    requestAnimationFrame(() => {
      body.style.height = "0px";
    });
  });

  body.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "height") return;

    if (card.open && body.style.height !== "0px") {
      body.style.height = "auto";
      return;
    }

    if (body.style.height === "0px") {
      card.open = false;
    }
  });
}
