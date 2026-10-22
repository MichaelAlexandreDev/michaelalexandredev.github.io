// Progressive enhancement: without JS (or with reduced motion) the page stays fully static.
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;
  root.classList.add("motion");

  // Terminal: commands are typed, outputs appear line by line.
  function typeTerminal(code) {
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push({ node: walker.currentNode, text: walker.currentNode.nodeValue });

    const pre = code.parentElement;
    pre.style.minHeight = `${pre.offsetHeight}px`;
    nodes.forEach(({ node }) => { node.nodeValue = ""; });

    const cursor = document.createElement("span");
    cursor.className = "terminal-cursor";
    cursor.setAttribute("aria-hidden", "true");

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let inCommand = false;

    (async () => {
      await wait(350);
      for (const { node, text } of nodes) {
        node.parentNode.insertBefore(cursor, node.nextSibling);
        if (node.parentElement.classList.contains("terminal-muted")) {
          node.nodeValue = text;
          inCommand = true;
          continue;
        }
        let i = 0;
        while (i < text.length) {
          if (inCommand) {
            const ch = text[i++];
            node.nodeValue += ch;
            if (ch === "\n") { inCommand = false; await wait(140); } else { await wait(26); }
          } else {
            const end = text.indexOf("\n", i);
            const stop = end === -1 ? text.length : end + 1;
            node.nodeValue += text.slice(i, stop);
            i = stop;
            await wait(70);
          }
        }
      }
      code.appendChild(cursor);
      code.closest(".terminal").classList.add("is-ready");
    })();
  }

  // Diagrams: inline the SVG so page CSS can draw its arrows and boxes.
  async function inlineDiagram(img) {
    const response = await fetch(img.getAttribute("src"));
    if (!response.ok) throw new Error(response.statusText);
    const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (svg.nodeName !== "svg") throw new Error("invalid svg");

    const scope = `flow-${img.getAttribute("src").split("/").pop().replace(".svg", "")}`;
    svg.classList.add("flow", scope);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("aria-label", img.alt);
    svg.removeAttribute("aria-labelledby");
    svg.querySelectorAll("style").forEach((style) => {
      style.textContent = style.textContent.replace(/(^|\})\s*\./g, `$1 .${scope} .`);
    });

    img.replaceWith(svg);

    let order = 0;
    svg.querySelectorAll("rect, text, path").forEach((el) => {
      if (el.closest("marker")) return;
      el.style.setProperty("--i", order++);
      if (el.matches(".line, .branch")) {
        const length = Math.ceil(el.getTotalLength());
        el.style.setProperty("--len", length);
        if (el.matches(".line")) {
          const pulse = el.cloneNode();
          pulse.setAttribute("class", "pulse");
          pulse.style.setProperty("--len", length);
          el.after(pulse);
        }
      }
    });
    return svg;
  }

  // Scroll reveal for sections, cards and diagrams.
  const revealTargets = [
    ".section-kicker", ".about-grid", ".section-heading", ".project-card",
    ".skills-grid article", ".rank-card", ".degree-card", ".credential-columns",
    ".contact > *",
  ];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.matches("[data-count]")) countUp(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll(revealTargets.join(",")).forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
  document.querySelectorAll(".skills-grid article").forEach((el, i) => {
    el.style.setProperty("--delay", `${(i % 3) * 90}ms`);
  });

  // Count-up for the CodeVita rank, keeping the page's number format.
  function countUp(el) {
    const target = Number(el.dataset.count);
    const format = new Intl.NumberFormat(document.documentElement.lang);
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format.format(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll(".rank-card strong").forEach((el) => {
    el.dataset.count = el.textContent.replace(/\D/g, "");
    observer.observe(el);
  });

  const terminalCode = document.querySelector(".terminal code");
  if (terminalCode) typeTerminal(terminalCode);

  document.querySelectorAll(".architecture img").forEach((img) => {
    inlineDiagram(img)
      .then((svg) => observer.observe(svg))
      .catch(() => {});
  });
})();
