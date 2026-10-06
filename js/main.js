(() => {
  const root = document.documentElement;
  const sheets = [...document.querySelectorAll(".sheet")];
  const links = [...document.querySelectorAll('a[href^="#"]')];
  const loader = document.getElementById("loader");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const hint = document.getElementById("scroll-hint");
  const hintLabel = document.getElementById("scroll-label");
  const fill = document.getElementById("fill");
  const num = document.getElementById("num");
  const live = document.getElementById("live");
  const menu = document.getElementById("menu");
  const toggle = document.querySelector(".nav-toggle");
  const copyBtn = document.getElementById("copy-email");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  const openedAt = performance.now();
  let index = 0;
  let desired = 0;
  let animating = false;
  let pendingRecord = false;
  let booted = false;
  let announced = false;

  if (hintLabel && coarse) hintLabel.textContent = "Swipe";

  function clamp(i) {
    return Math.max(0, Math.min(sheets.length - 1, i));
  }

  function indexFromHash() {
    const id = location.hash.replace("#", "");
    const found = sheets.findIndex((sheet) => sheet.id === id);
    return found >= 0 ? found : 0;
  }

  function duration(fast) {
    if (reduced) return 280;
    return fast ? 500 : 980;
  }

  function restack() {
    const total = sheets.length;
    sheets.forEach((sheet, i) => {
      sheet.style.zIndex = i < index ? String(10 + i) : String(120 + (total - i));
    });
  }

  function paint() {
    sheets.forEach((sheet, i) => {
      const on = i === index;
      sheet.classList.toggle("is-active", on);
      sheet.setAttribute("aria-hidden", on ? "false" : "true");
      if (on) sheet.removeAttribute("inert");
      else sheet.setAttribute("inert", "");
    });

    const id = sheets[index].id;
    document.querySelectorAll(".nav-pill a, .menu a, .top-actions a").forEach((link) => {
      const current = link.getAttribute("href") === `#${id}`;
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const label = sheets[index].dataset.label || "Page";
    num.textContent = String(index + 1).padStart(2, "0");
    fill.style.transform = `scaleX(${(index + 1) / sheets.length})`;
    prev.disabled = index === 0;
    next.disabled = index === sheets.length - 1;
    if (announced) live.textContent = `Page ${index + 1} of ${sheets.length}, ${label}`;
    announced = true;
    document.title = index === 0
      ? "Akila Bandara — UI/UX & Frontend Developer"
      : `${label} — Akila Bandara`;
  }

  function writeHistory(mode) {
    const url = `#${sheets[index].id}`;
    const state = { i: index };
    if (mode === "push") {
      if (location.hash !== url) history.pushState(state, "", url);
    } else {
      history.replaceState(state, "", url);
    }
  }

  function finishFlip(sheet, step, done) {
    sheet.classList.remove("is-turning", "is-fast");
    sheet.style.willChange = "";
    index = clamp(index + step);
    restack();
    paint();
    animating = false;
    done();
  }

  function flipOne(step, fast, done) {
    const forward = step > 0;
    const sheet = forward ? sheets[index] : sheets[index - 1];
    if (!sheet) {
      animating = false;
      done();
      return;
    }

    const incoming = sheets[index + step];
    if (incoming) incoming.classList.add("is-active");

    animating = true;
    sheet.style.zIndex = "400";
    sheet.style.willChange = "transform, opacity";
    sheet.classList.toggle("is-fast", fast);
    sheet.classList.add("is-turning");
    void sheet.offsetWidth;
    sheet.classList.toggle("is-turned", forward);

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      finishFlip(sheet, step, done);
    };

    const timer = window.setTimeout(settle, duration(fast) + 70);
    sheet.addEventListener("transitionend", function onEnd(event) {
      if (event.target !== sheet) return;
      if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
      sheet.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timer);
      settle();
    });
  }

  function step() {
    if (desired === index) {
      if (pendingRecord) {
        pendingRecord = false;
        writeHistory("push");
      }
      animating = false;
      return;
    }
    const dir = desired > index ? 1 : -1;
    const fast = Math.abs(desired - index) > 1;
    flipOne(dir, fast, step);
  }

  function go(target, record) {
    desired = clamp(target);
    pendingRecord = Boolean(record);
    if (desired === index && !animating) {
      pendingRecord = false;
      return;
    }
    if (!animating) step();
  }

  function jump(target) {
    index = clamp(target);
    desired = index;
    sheets.forEach((sheet, i) => sheet.classList.toggle("is-turned", i < index));
    restack();
    paint();
    writeHistory("replace");
  }

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (!root.classList.contains("book-on")) return;
      const id = link.getAttribute("href").slice(1);
      const found = sheets.findIndex((sheet) => sheet.id === id);
      if (found < 0) return;
      event.preventDefault();
      setMenu(false);
      go(found, true);
    });
  });

  prev.addEventListener("click", () => go(index - 1, true));
  next.addEventListener("click", () => go(index + 1, true));

  if (window.matchMedia("(pointer: fine)").matches) {
    let cursorOn = false;
    const placeCursor = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      hint.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
      const hot = event.target instanceof Element && event.target.closest("a, button, input, textarea, select, label");
      hint.classList.toggle("is-hot", Boolean(hot));
      if (!cursorOn) {
        root.classList.add("cursor-on");
        cursorOn = true;
      }
    };
    window.addEventListener("pointermove", placeCursor);
    document.addEventListener("pointerout", (event) => {
      if (event.relatedTarget) return;
      root.classList.remove("cursor-on");
      cursorOn = false;
    });
  }

  toggle.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
      return;
    }
    if (!root.classList.contains("book-on")) return;
    if (!menu.hidden) return;
    const typing = event.target.closest("input, textarea");
    if (typing) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      go(index + 1, true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      go(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      go(sheets.length - 1, true);
    } else if (event.key === " " && !event.target.closest("a, button")) {
      event.preventDefault();
      go(index + (event.shiftKey ? -1 : 1), true);
    }
  });

  let wheelAcc = 0;
  let wheelTimer = 0;
  window.addEventListener("wheel", (event) => {
    if (!root.classList.contains("book-on")) return;
    if (!menu.hidden) return;
    event.preventDefault();
    if (animating) return;

    const scroller = sheets[index].querySelector(".scroller");
    const down = event.deltaY > 0;
    const canDown = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
    const canUp = scroller.scrollTop > 0;
    if ((down && canDown) || (!down && canUp)) {
      scroller.scrollTop += event.deltaY;
      return;
    }

    wheelAcc += event.deltaY;
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) < 48) return;
    const dir = wheelAcc > 0 ? 1 : -1;
    wheelAcc = 0;
    go(index + dir, true);
  }, { passive: false });

  let touchY = null;
  let touchX = null;
  window.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchY = event.touches[0].clientY;
    touchX = event.touches[0].clientX;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (!root.classList.contains("book-on") || touchY == null || animating || !menu.hidden) {
      touchY = null;
      return;
    }
    const dy = touchY - event.changedTouches[0].clientY;
    const dx = touchX - event.changedTouches[0].clientX;
    touchY = null;
    touchX = null;
    if (Math.abs(dy) < 54 || Math.abs(dy) < Math.abs(dx)) return;
    const scroller = sheets[index].querySelector(".scroller");
    const down = dy > 0;
    const canDown = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
    const canUp = scroller.scrollTop > 0;
    if ((down && canDown) || (!down && canUp)) return;
    go(index + (down ? 1 : -1), true);
  }, { passive: true });

  window.addEventListener("popstate", () => {
    if (!root.classList.contains("book-on")) return;
    go(indexFromHash(), false);
  });

  copyBtn.addEventListener("click", async () => {
    const email = "bandara98akila@gmail.com";
    try {
      await navigator.clipboard.writeText(email);
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("is-copied");
    } catch {
      window.location.href = `mailto:${email}`;
      return;
    }
    window.setTimeout(() => {
      copyBtn.textContent = "Copy email";
      copyBtn.classList.remove("is-copied");
    }, 1800);
  });

  function boot() {
    if (booted) return;
    booted = true;
    jump(indexFromHash());
    root.classList.add("book-on");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.add("is-live"));
    });

    const wait = Math.max(0, 560 - (performance.now() - openedAt));
    window.setTimeout(() => {
      loader.classList.add("is-done");
      const remove = () => loader.remove();
      loader.addEventListener("transitionend", remove, { once: true });
      window.setTimeout(remove, 1100);
    }, wait);
  }

  const safety = window.setTimeout(boot, 1600);
  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => {
    window.clearTimeout(safety);
    boot();
  }).catch(() => boot());
})();
