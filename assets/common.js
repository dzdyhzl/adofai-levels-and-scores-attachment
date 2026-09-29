const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
const DIRECT_API_BASE = "https://api.tuforums.com";
const API_BASE = (LOCAL_HOSTS.includes(location.hostname) ? DIRECT_API_BASE : "").replace(/\/+$/, "");

let difficultiesPromise = null;

function toText(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value.map(toText).filter((part) => part != null && part !== "");
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const inner = value.name ?? value.displayName ?? value.title;
    return inner == null ? null : String(inner);
  }
  const text = String(value);
  return text.trim() === "" ? null : text;
}

function formatDuration(seconds) {
  const total = Math.floor(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return null;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAccuracy(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `${(number * 100).toFixed(4)}%`;
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${(number * 100).toFixed(2)}%`;
}

function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("zh-CN");
}

function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? ""));
}

function badgeTextColor(hex) {
  const match = String(hex ?? "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(match)) return "#fff";
  const red = parseInt(match.slice(0, 2), 16);
  const green = parseInt(match.slice(2, 4), 16);
  const blue = parseInt(match.slice(4, 6), 16);
  return 0.299 * red + 0.587 * green + 0.114 * blue > 160 ? "#1f2430" : "#fff";
}

function createDiffBadge(difficulty, name) {
  const badge = document.createElement("span");
  badge.className = "diffBadge";
  const color = toText(difficulty.color) || "#6b7280";
  if (isValidHexColor(color)) {
    badge.style.background = color;
    badge.style.color = badgeTextColor(color);
  }
  const icon = toText(difficulty.icon);
  if (icon) {
    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";
    img.loading = "lazy";
    badge.append(img);
  }
  badge.append(document.createTextNode(name));
  return badge;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function loadDifficulties(base) {
  if (!difficultiesPromise) {
    difficultiesPromise = fetchJson(`${base}/v2/database/difficulties`).catch(() => []);
  }
  return difficultiesPromise;
}

async function resolveDifficulty(base, levelData) {
  if (levelData.difficulty) return levelData.difficulty;
  const diffId = levelData.diffId ?? levelData.difficultyId;
  if (diffId == null) return null;
  const list = await loadDifficulties(base);
  return (
    (Array.isArray(list) ? list : []).find(
      (item) => String(item.id) === String(diffId)
    ) ?? null
  );
}

function renderPageNumbers(container, current, pages, goToPageFn) {
  container.innerHTML = "";
  const createButton = (label, target, isCurrent = false, isDisabled = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (isCurrent) button.classList.add("currentPage");
    if (isDisabled) button.disabled = true;
    else button.addEventListener("click", () => goToPageFn(target));
    return button;
  };
  const createDots = () => {
    const span = document.createElement("span");
    span.className = "pageDots";
    span.textContent = "…";
    return span;
  };

  container.append(createButton("«", 1, false, current <= 1));
  const numbers = new Set([1, pages, current]);
  if (current > 1) numbers.add(current - 1);
  if (current < pages) numbers.add(current + 1);
  let previous = null;
  for (const n of [...numbers].sort((a, b) => a - b)) {
    if (previous != null && n - previous > 1) container.append(createDots());
    container.append(createButton(String(n), n, n === current));
    previous = n;
  }
  container.append(createButton("»", pages, false, current >= pages));
}

function setupTopNavScroll() {
  const nav = document.querySelector(".topNav");
  if (!nav) return;
  addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });
}

setupTopNavScroll();
