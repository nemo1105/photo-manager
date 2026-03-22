export function normalizeLocale(raw) {
  if (!raw) {
    return "";
  }
  const token = String(raw).trim().split(",")[0].split(";")[0].trim().toLowerCase().replaceAll("_", "-");
  if (!token) {
    return "";
  }
  if (token.startsWith("zh")) {
    return "zh-CN";
  }
  if (token.startsWith("en")) {
    return "en";
  }
  return "";
}

export function getPath(source, path) {
  return path.reduce((acc, part) => (acc ? acc[part] : undefined), source);
}

export function setPath(target, path, value) {
  let current = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function canonicalKey(event) {
  if (!event.key) {
    return "";
  }
  if (event.key === " ") {
    return "space";
  }
  const key = event.key.toLowerCase();
  if (key === "esc") {
    return "escape";
  }
  if (["escape", "arrowleft", "arrowright", "arrowup", "arrowdown", "backspace", "enter", "tab", "delete"].includes(key)) {
    return key;
  }
  return key.length === 1 ? key : "";
}

export function createAppHelpers({ state, t }) {
  function numberOrZero(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.trunc(numeric);
  }

  function normalizeDecorations(value) {
    return Array.isArray(value)
      ? value
          .map((entry) => ({
            id: entry.id || "",
            icon: entry.icon || "check",
            tone: entry.tone || "neutral",
            tooltip: entry.tooltip || "",
            priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : 0,
          }))
          .filter((entry) => entry.id)
      : [];
  }

  function normalizeDirectories(value) {
    return Array.isArray(value)
      ? value.map((entry) => ({
          name: entry.name || "",
          path: entry.path || "",
          hasChildren: !!entry.hasChildren,
          imageCount: numberOrZero(entry.imageCount),
          imageCountEstimated: !!entry.imageCountEstimated,
          decorations: normalizeDecorations(entry.decorations),
        }))
      : [];
  }

  function normalizeImages(value) {
    return Array.isArray(value)
      ? value.map((entry) => ({
          name: entry.name || "",
          path: entry.path || "",
          url: entry.url || "",
        }))
      : [];
  }

  function normalizeBreadcrumbs(value) {
    return Array.isArray(value)
      ? value.map((entry) => ({ name: entry.name || t("common.root"), path: entry.path || "" }))
      : [{ name: t("common.root"), path: "" }];
  }

  function normalizeSession(value) {
    return value && value.active ? { active: true, rootPath: value.rootPath || "" } : { active: false, rootPath: "" };
  }

  function normalizeBrowserData(data) {
    return {
      ...data,
      currentImageCount: numberOrZero(data.currentImageCount),
      currentImageCountEstimated: !!data.currentImageCountEstimated,
      currentDecorations: normalizeDecorations(data.currentDecorations),
      directories: normalizeDirectories(data.directories),
      images: normalizeImages(data.images),
      breadcrumbs: normalizeBreadcrumbs(data.breadcrumbs),
      session: normalizeSession(data.session),
      currentDirStartsAsReview: !!data.currentDirStartsAsReview,
    };
  }

  function normalizeSlideshowData(data) {
    return {
      ...data,
      directories: normalizeDirectories(data.directories),
      images: normalizeImages(data.images),
      breadcrumbs: normalizeBreadcrumbs(data.breadcrumbs),
      session: normalizeSession(data.session),
      actionButtons: Array.isArray(data.actionButtons) ? data.actionButtons : [],
    };
  }

  function normalizeTreeData(data) {
    return {
      ...data,
      currentImageCount: numberOrZero(data.currentImageCount),
      currentImageCountEstimated: !!data.currentImageCountEstimated,
      currentDecorations: normalizeDecorations(data.currentDecorations),
      directories: normalizeDirectories(data.directories),
    };
  }

  function pathChain(path) {
    if (!path) {
      return [""];
    }
    const chain = [""];
    const parts = path.split("/").filter(Boolean);
    let current = "";
    parts.forEach((part) => {
      current = current ? `${current}/${part}` : part;
      chain.push(current);
    });
    return chain;
  }

  function isPathAncestor(candidate, current) {
    if (candidate === "") {
      return true;
    }
    return current === candidate || current.startsWith(`${candidate}/`);
  }

  function pathLabel(path, fallback) {
    return path && path.length ? path : fallback || t("common.root");
  }

  function keyLabel(key) {
    if (!key) {
      return "";
    }
    const map = {
      space: t("key.space"),
      escape: t("key.escape"),
      arrowleft: t("key.arrowleft"),
      arrowright: t("key.arrowright"),
      arrowup: t("key.arrowup"),
      arrowdown: t("key.arrowdown"),
      backspace: t("key.backspace"),
      enter: t("key.enter"),
      tab: t("key.tab"),
      delete: t("key.delete"),
    };
    return map[key] || key.toUpperCase();
  }

  function keyBindingLabel(key) {
    if (!key) {
      return "";
    }
    const normalized = String(key).trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    if (state.locale === "zh-CN") {
      const map = {
        space: t("key.space"),
        escape: t("key.escape"),
        arrowleft: t("key.arrowleft"),
        arrowright: t("key.arrowright"),
        arrowup: t("key.arrowup"),
        arrowdown: t("key.arrowdown"),
        backspace: t("key.backspace"),
        enter: t("key.enter"),
        tab: t("key.tab"),
        delete: t("key.delete"),
      };
      return map[normalized] || normalized;
    }
    const map = {
      space: "space",
      escape: "esc",
      arrowleft: "arrow-left",
      arrowright: "arrow-right",
      arrowup: "arrow-up",
      arrowdown: "arrow-down",
      backspace: "backspace",
      enter: "enter",
      tab: "tab",
      delete: "del",
    };
    if (map[normalized]) {
      return map[normalized];
    }
    return normalized.length === 1 && /^[a-z0-9]$/i.test(normalized)
      ? normalized.toUpperCase()
      : normalized;
  }

  function capturePathLabel(path) {
    const labelMap = {
      "keys.browser.startSession": t("capture.browser.startSession"),
      "keys.browser.treeUp": t("capture.browser.treeUp"),
      "keys.browser.treeDown": t("capture.browser.treeDown"),
      "keys.browser.expandDir": t("capture.browser.expandDir"),
      "keys.browser.collapseDir": t("capture.browser.collapseDir"),
      "keys.preview.close": t("capture.preview.close"),
      "keys.preview.next": t("capture.preview.next"),
      "keys.preview.prev": t("capture.preview.prev"),
      "keys.slideshow.next": t("capture.slideshow.next"),
      "keys.slideshow.prev": t("capture.slideshow.prev"),
      "keys.slideshow.endSession": t("capture.slideshow.endSession"),
    };
    return labelMap[path.join(".")] || path.join(".");
  }

  function isCapturePath(path) {
    return state.captureTarget && state.captureTarget.type === "path" && state.captureTarget.path.join(".") === path.join(".");
  }

  function isCaptureAction(index) {
    return state.captureTarget && state.captureTarget.type === "action" && state.captureTarget.index === index;
  }

  function currentData() {
    if (state.mode === "slideshow" && state.slideshow) {
      return state.slideshow;
    }
    if (state.browser) {
      return state.browser;
    }
    return {
      currentPath: "",
      currentName: t("common.root"),
      breadcrumbs: [{ name: t("common.root"), path: "" }],
      session: { active: false, rootPath: "" },
    };
  }

  function currentSession() {
    return normalizeSession(currentData().session);
  }

  function currentSlideImage() {
    if (!state.slideshow || !state.slideshow.images.length) {
      return null;
    }
    return state.slideshow.images[state.slideshow.index] || null;
  }

  function canStartWorkFromBrowser() {
    if (!state.browser || state.browserPending?.active) {
      return false;
    }
    return state.browser.images.length > 0;
  }

  function getConfig(path) {
    return state.config ? getPath(state.config, path) : "";
  }

  return {
    canStartWorkFromBrowser,
    capturePathLabel,
    currentData,
    currentSession,
    currentSlideImage,
    getConfig,
    isCaptureAction,
    isCapturePath,
    isPathAncestor,
    keyBindingLabel,
    keyLabel,
    normalizeBreadcrumbs,
    normalizeBrowserData,
    normalizeDirectories,
    normalizeImages,
    normalizeSlideshowData,
    normalizeTreeData,
    pathChain,
    pathLabel,
  };
}
