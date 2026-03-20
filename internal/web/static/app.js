(function () {
  const state = {
    mode: "browser",
    browser: null,
    slideshow: null,
    preview: { open: false, images: [], index: 0 },
    config: null,
    launchRoot: "",
    notice: { type: "info", text: "" },
    settingsOpen: false,
    settingsDraft: null,
    captureTarget: null,
  };

  const browserView = document.getElementById("browserView");
  const slideshowView = document.getElementById("slideshowView");
  const previewModal = document.getElementById("previewModal");
  const settingsModal = document.getElementById("settingsModal");

  bindStaticEvents();
  init().catch((error) => showNotice(error.message, "error"));

  async function init() {
    await loadBrowser("");
  }

  function bindStaticEvents() {
    document.addEventListener("keydown", onKeyDown);
    document.getElementById("previewCloseButton").addEventListener("click", closePreview);
    document.getElementById("settingsCloseButton").addEventListener("click", closeSettings);
    document.getElementById("saveSettingsButton").addEventListener("click", saveSettings);
    document.getElementById("addMoveActionButton").addEventListener("click", () => addAction("move"));
    document.getElementById("addDeleteActionButton").addEventListener("click", () => addAction("delete"));
    document.getElementById("addRestoreActionButton").addEventListener("click", () => addAction("restore"));
    previewModal.addEventListener("click", (event) => {
      if (event.target.dataset.closePreview === "true") {
        closePreview();
      }
    });
    settingsModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeSettings === "true") {
        closeSettings();
      }
    });
  }

  async function apiGet(path) {
    const response = await fetch(path);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "request failed");
    }
    return data;
  }

  async function apiPost(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "request failed");
    }
    return data;
  }

  async function loadBrowser(path) {
    const data = await apiGet(`/api/browser?path=${encodeURIComponent(path || "")}`);
    state.browser = data;
    state.config = data.config;
    state.launchRoot = data.launchRoot || state.launchRoot;
    state.mode = "browser";
    browserView.hidden = false;
    slideshowView.hidden = true;
    if (data.notice) {
      showNotice(data.notice, "info");
      return;
    }
    render();
  }

  async function loadSlideshow(path, preferredIndex) {
    const data = await apiGet(`/api/slideshow?path=${encodeURIComponent(path || "")}`);
    state.slideshow = data;
    state.config = data.config;
    if (!data.session.active) {
      await loadBrowser(path || "");
      if (data.notice) {
        showNotice(data.notice, "info");
      }
      return;
    }
    state.mode = "slideshow";
    browserView.hidden = true;
    slideshowView.hidden = false;
    state.slideshow.index = clamp(preferredIndex || 0, 0, Math.max(0, data.images.length - 1));
    if (data.notice) {
      showNotice(data.notice, "info");
      return;
    }
    render();
  }

  async function openWorkMode() {
    const result = await apiPost("/api/session/start", { path: state.browser.currentPath });
    if (result.session && result.session.active && !state.browser.session.active) {
      showNotice("work session started", "info");
    }
    await loadSlideshow(result.slideshowPath || state.browser.currentPath, 0);
  }

  async function backToBrowser() {
    await loadBrowser(state.slideshow.currentPath);
  }

  async function endSession() {
    await apiPost("/api/session/end", {});
    showNotice("work session ended", "info");
    await loadBrowser(state.mode === "slideshow" ? state.slideshow.currentPath : state.browser.currentPath);
  }

  async function runAction(actionKey) {
    const currentImage = state.slideshow.images[state.slideshow.index];
    if (!currentImage) {
      return;
    }
    const preferred = state.slideshow.index;
    const result = await apiPost("/api/action", {
      currentPath: state.slideshow.currentPath,
      imagePath: currentImage.path,
      actionKey,
    });
    showNotice(result.notice, "info");
    await loadSlideshow(state.slideshow.currentPath, preferred);
  }

  function openPreview(index) {
    state.preview = { open: true, images: state.browser.images || [], index };
    render();
  }

  function closePreview() {
    state.preview.open = false;
    render();
  }

  function movePreview(delta) {
    if (!state.preview.open || !state.preview.images.length) {
      return;
    }
    state.preview.index = clamp(state.preview.index + delta, 0, state.preview.images.length - 1);
    render();
  }

  async function openSettings() {
    state.config = await apiGet("/api/config");
    state.settingsDraft = clone(state.config);
    state.settingsOpen = true;
    state.captureTarget = null;
    render();
  }

  function closeSettings() {
    state.settingsOpen = false;
    state.captureTarget = null;
    render();
  }

  function addAction(type) {
    if (!state.settingsDraft) {
      return;
    }
    state.settingsDraft.actions.push({
      key: "",
      action: type,
      target: type === "move" ? "new-folder" : "",
    });
    render();
  }

  async function saveSettings() {
    if (!state.settingsDraft) {
      return;
    }
    const saved = await apiPost("/api/config", state.settingsDraft);
    state.config = saved;
    state.settingsOpen = false;
    state.captureTarget = null;
    showNotice("settings saved", "info");
    if (state.mode === "slideshow" && state.slideshow) {
      await loadSlideshow(state.slideshow.currentPath, state.slideshow.index || 0);
      return;
    }
    await loadBrowser(state.browser ? state.browser.currentPath : "");
  }

  function render() {
    renderShell();
    renderBrowser();
    renderSlideshow();
    renderPreview();
    renderSettings();
  }

  function renderShell() {
    const session = currentSession();
    document.body.classList.toggle("session-active", !!session.active);
    document.getElementById("statusLine").textContent = session.active
      ? `Launch root: ${state.launchRoot} | Active work root: ${session.rootPath || "(root)"}`
      : `Launch root: ${state.launchRoot} | No active work session`;

    document.getElementById("toolbar").innerHTML = [
      controlButton("Up", keyLabel(getConfig(["keys", "browser", "upDir"])), !!currentData().canGoUp, "up-dir"),
      controlButton(toolbarStartLabel(), keyLabel(toolbarStartKey()), true, "start-work"),
      controlButton("End Session", keyLabel(getConfig(["keys", state.mode === "slideshow" ? "slideshow" : "browser", "endSession"])), !!session.active, "end-session"),
      controlButton("Settings", keyLabel(getConfig(["keys", "browser", "openSettings"])), true, "open-settings"),
    ].join("");

    document.getElementById("breadcrumbs").innerHTML = (currentData().breadcrumbs || [])
      .map((crumb) => `<button class="crumb ${crumb.path === currentData().currentPath ? "current" : ""}" data-browse-path="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</button>`)
      .join("");
    document.querySelectorAll("[data-browse-path]").forEach((button) => {
      button.addEventListener("click", async () => {
        await loadBrowser(button.dataset.browsePath || "");
      });
    });

    renderNotice();
    bindToolbar();
  }

  function renderNotice() {
    const notice = document.getElementById("notice");
    if (state.notice.text) {
      notice.hidden = false;
      notice.className = `notice ${state.notice.type}`;
      notice.textContent = state.notice.text;
      return;
    }
    notice.hidden = true;
    notice.className = "notice";
    notice.textContent = "";
  }

  function renderBrowser() {
    if (!state.browser) {
      browserView.innerHTML = `<div class="empty-state">Loading browser...</div>`;
      return;
    }
    const session = currentSession();
    browserView.innerHTML = `
      <div class="button-row">
        ${controlButton(session.active ? "Enter Current Directory" : "Start Current Directory", keyLabel(getConfig(["keys", "browser", "startSession"])), true, "start-work")}
        ${controlButton("End Session", keyLabel(getConfig(["keys", "browser", "endSession"])), !!session.active, "end-session")}
        ${controlButton("Up", keyLabel(getConfig(["keys", "browser", "upDir"])), !!state.browser.canGoUp, "up-dir")}
        ${controlButton("Settings", keyLabel(getConfig(["keys", "browser", "openSettings"])), true, "open-settings")}
      </div>
      <div class="browser-grid">
        <section class="browser-column">
          <h2>Folders</h2>
          <div class="hint">Double-click a folder card to enter it.</div>
          ${state.browser.directories.length ? state.browser.directories.map((dir) => `
            <article class="entry-card" data-enter-dir="${escapeHtml(dir.path)}">
              <strong>${escapeHtml(dir.name)}</strong>
              <span class="entry-meta">${escapeHtml(dir.path || "(root)")}</span>
            </article>
          `).join("") : `<div class="empty-state">No visible folders in this directory.</div>`}
        </section>
        <section class="browser-column">
          <h2>Pictures</h2>
          <div class="hint">Click an image to preview only. Preview does not start a work session.</div>
          ${state.browser.images.length ? state.browser.images.map((image, index) => `
            <article class="image-card" data-preview-index="${index}">
              <img class="thumb" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}">
              <strong>${escapeHtml(image.name)}</strong>
              <span class="entry-meta">${escapeHtml(image.path)}</span>
            </article>
          `).join("") : `<div class="empty-state">No supported pictures in this directory.</div>`}
        </section>
      </div>
    `;
    bindToolbar();
    browserView.querySelectorAll("[data-enter-dir]").forEach((card) => {
      card.addEventListener("dblclick", async () => {
        await loadBrowser(card.dataset.enterDir || "");
      });
    });
    browserView.querySelectorAll("[data-preview-index]").forEach((card) => {
      card.addEventListener("click", () => openPreview(Number(card.dataset.previewIndex)));
    });
  }

  function renderSlideshow() {
    if (!state.slideshow || state.mode !== "slideshow") {
      slideshowView.innerHTML = "";
      return;
    }
    const images = state.slideshow.images || [];
    const current = images[state.slideshow.index];
    slideshowView.innerHTML = `
      <div class="slideshow-stage">
        <section class="slide-panel">
          ${current ? `
            <div class="slide-title">${escapeHtml(current.name)}</div>
            <img class="slide-image" src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
            <div class="hint">${state.slideshow.index + 1} / ${images.length} | ${escapeHtml(current.path)}</div>
          ` : `<div class="empty-state">No images left in this directory.</div>`}
        </section>
        <aside class="side-panel">
          <div class="button-row">
            ${slideButton("Previous", "slide-prev", keyLabel(getConfig(["keys", "slideshow", "prev"])), !!current)}
            ${slideButton("Next", "slide-next", keyLabel(getConfig(["keys", "slideshow", "next"])), !!current)}
            ${slideButton("Back To Browser", "slide-back", keyLabel(getConfig(["keys", "slideshow", "backToBrowser"])), true)}
            ${slideButton("End Session", "end-session", keyLabel(getConfig(["keys", "slideshow", "endSession"])), true)}
          </div>
          <p class="muted-block">Current directory: ${escapeHtml(state.slideshow.currentPath || "(root)")}</p>
          ${state.slideshow.currentDirIsTarget ? `<div class="tag session">Configured target directory</div>` : ""}
          <div class="button-row">
            ${(state.slideshow.actionButtons || []).map((action) => `
              <button class="action-button ${action.action === "delete" ? "danger-button" : "secondary-button"}" data-run-action="${escapeHtml(action.key)}" ${action.enabled ? "" : "disabled"}>
                <strong>${escapeHtml(action.label)}</strong>
                <span>${keyLabel(action.key)}</span>
              </button>
            `).join("")}
          </div>
        </aside>
      </div>
    `;
    bindToolbar();
    document.querySelectorAll("[data-slideshow-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await handleSlideshowAction(button.dataset.slideshowAction);
        } catch (error) {
          showNotice(error.message, "error");
        }
      });
    });
    document.querySelectorAll("[data-run-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await runAction(button.dataset.runAction);
        } catch (error) {
          showNotice(error.message, "error");
        }
      });
    });
  }

  function renderPreview() {
    if (!state.preview.open) {
      previewModal.hidden = true;
      return;
    }
    const images = state.preview.images || [];
    const current = images[state.preview.index];
    if (!current) {
      closePreview();
      return;
    }
    previewModal.hidden = false;
    document.getElementById("previewBody").innerHTML = `
      <img src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
      <div class="hint">${state.preview.index + 1} / ${images.length} | ${escapeHtml(current.name)}</div>
    `;
    document.getElementById("previewControls").innerHTML = `
      ${previewButton("Previous", keyLabel(getConfig(["keys", "preview", "prev"])), state.preview.index > 0, "preview-prev")}
      ${previewButton("Next", keyLabel(getConfig(["keys", "preview", "next"])), state.preview.index < images.length - 1, "preview-next")}
      ${previewButton("Close", keyLabel(getConfig(["keys", "preview", "close"])), true, "preview-close")}
    `;
    document.querySelectorAll("[data-preview-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.previewAction;
        if (action === "preview-prev") {
          movePreview(-1);
        } else if (action === "preview-next") {
          movePreview(1);
        } else if (action === "preview-close") {
          closePreview();
        }
      });
    });
  }

  function renderSettings() {
    settingsModal.hidden = !state.settingsOpen;
    if (!state.settingsOpen || !state.settingsDraft) {
      return;
    }

    document.getElementById("settingsBody").innerHTML = `
      ${settingsSection("Browser Keys", [
        settingsField("Start Session", ["keys", "browser", "startSession"]),
        settingsField("End Session", ["keys", "browser", "endSession"]),
        settingsField("Up Directory", ["keys", "browser", "upDir"]),
        settingsField("Open Settings", ["keys", "browser", "openSettings"]),
      ])}
      ${settingsSection("Preview Keys", [
        settingsField("Close Preview", ["keys", "preview", "close"]),
        settingsField("Next Preview Image", ["keys", "preview", "next"]),
        settingsField("Previous Preview Image", ["keys", "preview", "prev"]),
      ])}
      ${settingsSection("Slideshow Keys", [
        settingsField("Next Slide", ["keys", "slideshow", "next"]),
        settingsField("Previous Slide", ["keys", "slideshow", "prev"]),
        settingsField("Back To Browser", ["keys", "slideshow", "backToBrowser"]),
        settingsField("End Session", ["keys", "slideshow", "endSession"]),
      ])}
      <section class="settings-section">
        <h3>Actions</h3>
        <div class="hint">Move actions require a target path.</div>
        ${(state.settingsDraft.actions || []).map((action, index) => `
          <div class="settings-row">
            <div class="settings-field">
              <label>Key</label>
              <div class="toolbar">
                <input value="${escapeHtml(action.key || "")}" readonly>
                <button class="secondary-button" data-capture-action="${index}">Capture</button>
              </div>
            </div>
            <div class="settings-field">
              <label>Action</label>
              <select data-action-field="action" data-action-index="${index}">
                ${option("move", action.action === "move")}
                ${option("delete", action.action === "delete")}
                ${option("restore", action.action === "restore")}
              </select>
            </div>
            <div class="settings-field">
              <label>Target</label>
              <input data-action-field="target" data-action-index="${index}" value="${escapeHtml(action.target || "")}" placeholder="keep or D:/Photos/keep" ${action.action === "move" ? "" : "disabled"}>
            </div>
            <div class="settings-row-actions">
              <button class="danger-button" data-remove-action="${index}">Remove</button>
            </div>
          </div>
        `).join("")}
      </section>
    `;

    document.getElementById("captureHint").textContent = state.captureTarget ? "Press one key to capture." : "";

    document.querySelectorAll("[data-capture-key]").forEach((button) => {
      button.addEventListener("click", () => {
        state.captureTarget = { type: "path", path: button.dataset.captureKey.split(".") };
        render();
      });
    });
    document.querySelectorAll("[data-capture-action]").forEach((button) => {
      button.addEventListener("click", () => {
        state.captureTarget = { type: "action", index: Number(button.dataset.captureAction) };
        render();
      });
    });
    document.querySelectorAll("[data-action-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const index = Number(event.target.dataset.actionIndex);
        const field = event.target.dataset.actionField;
        state.settingsDraft.actions[index][field] = event.target.value;
      });
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.actionIndex);
        const field = event.target.dataset.actionField;
        state.settingsDraft.actions[index][field] = event.target.value;
        if (field === "action" && event.target.value !== "move") {
          state.settingsDraft.actions[index].target = "";
          render();
        }
      });
    });
    document.querySelectorAll("[data-remove-action]").forEach((button) => {
      button.addEventListener("click", () => {
        state.settingsDraft.actions.splice(Number(button.dataset.removeAction), 1);
        render();
      });
    });
  }

  function bindToolbar() {
    document.querySelectorAll("[data-toolbar-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.toolbarAction;
        try {
          if (action === "up-dir" && currentData().canGoUp) {
            await loadBrowser(currentData().parentPath || "");
          } else if (action === "start-work") {
            if (state.mode === "slideshow") {
              await backToBrowser();
            } else {
              await openWorkMode();
            }
          } else if (action === "end-session" && currentSession().active) {
            await endSession();
          } else if (action === "open-settings") {
            await openSettings();
          }
        } catch (error) {
          showNotice(error.message, "error");
        }
      });
    });
  }

  async function handleSlideshowAction(action) {
    if (action === "slide-prev" && state.slideshow.images.length) {
      state.slideshow.index = clamp(state.slideshow.index - 1, 0, state.slideshow.images.length - 1);
      render();
      return;
    }
    if (action === "slide-next" && state.slideshow.images.length) {
      state.slideshow.index = clamp(state.slideshow.index + 1, 0, state.slideshow.images.length - 1);
      render();
      return;
    }
    if (action === "slide-back") {
      await backToBrowser();
      return;
    }
    if (action === "end-session") {
      await endSession();
    }
  }

  function onKeyDown(event) {
    const key = canonicalKey(event);
    if (!key) {
      return;
    }

    if (state.captureTarget) {
      event.preventDefault();
      if (state.captureTarget.type === "path") {
        setPath(state.settingsDraft, state.captureTarget.path, key);
      } else if (state.captureTarget.type === "action") {
        state.settingsDraft.actions[state.captureTarget.index].key = key;
      }
      state.captureTarget = null;
      render();
      return;
    }

    if (state.settingsOpen) {
      return;
    }

    if (state.preview.open) {
      handlePreviewKey(key, event);
      return;
    }
    if (state.mode === "slideshow") {
      handleSlideshowKey(key, event);
      return;
    }
    handleBrowserKey(key, event);
  }

  function handleBrowserKey(key, event) {
    const keys = state.config.keys.browser;
    if (key === keys.startSession) {
      event.preventDefault();
      openWorkMode().catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.endSession && currentSession().active) {
      event.preventDefault();
      endSession().catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.upDir && state.browser.canGoUp) {
      event.preventDefault();
      loadBrowser(state.browser.parentPath || "").catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.openSettings) {
      event.preventDefault();
      openSettings().catch((error) => showNotice(error.message, "error"));
    }
  }

  function handlePreviewKey(key, event) {
    const keys = state.config.keys.preview;
    if (key === keys.close) {
      event.preventDefault();
      closePreview();
      return;
    }
    if (key === keys.next) {
      event.preventDefault();
      movePreview(1);
      return;
    }
    if (key === keys.prev) {
      event.preventDefault();
      movePreview(-1);
    }
  }

  function handleSlideshowKey(key, event) {
    const keys = state.config.keys.slideshow;
    if (key === keys.next) {
      event.preventDefault();
      handleSlideshowAction("slide-next");
      return;
    }
    if (key === keys.prev) {
      event.preventDefault();
      handleSlideshowAction("slide-prev");
      return;
    }
    if (key === keys.backToBrowser) {
      event.preventDefault();
      backToBrowser().catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.endSession) {
      event.preventDefault();
      endSession().catch((error) => showNotice(error.message, "error"));
      return;
    }
    const action = (state.slideshow.actionButtons || []).find((item) => item.key === key && item.enabled);
    if (action) {
      event.preventDefault();
      runAction(action.key).catch((error) => showNotice(error.message, "error"));
    }
  }

  function controlButton(label, key, enabled, action) {
    return `<button class="control-button secondary-button" data-toolbar-action="${action}" ${enabled ? "" : "disabled"}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(key || "")}</span></button>`;
  }

  function slideButton(label, action, key, enabled) {
    return `<button class="secondary-button" data-slideshow-action="${action}" ${enabled ? "" : "disabled"}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(key || "")}</span></button>`;
  }

  function previewButton(label, key, enabled, action) {
    return `<button class="secondary-button" data-preview-action="${action}" ${enabled ? "" : "disabled"}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(key || "")}</span></button>`;
  }

  function settingsSection(title, fields) {
    return `<section class="settings-section"><h3>${escapeHtml(title)}</h3><div class="settings-grid">${fields.join("")}</div></section>`;
  }

  function settingsField(label, path) {
    const value = getPath(state.settingsDraft, path) || "";
    return `
      <div class="settings-field">
        <label>${escapeHtml(label)}</label>
        <div class="toolbar">
          <input value="${escapeHtml(value)}" readonly>
          <button class="secondary-button" data-capture-key="${escapeHtml(path.join("."))}">Capture</button>
        </div>
      </div>
    `;
  }

  function option(value, selected) {
    return `<option value="${value}" ${selected ? "selected" : ""}>${value}</option>`;
  }

  function toolbarStartLabel() {
    return state.mode === "slideshow" ? "Back To Browser" : (currentSession().active ? "Enter Current Directory" : "Start Current Directory");
  }

  function toolbarStartKey() {
    return state.mode === "slideshow"
      ? getConfig(["keys", "slideshow", "backToBrowser"])
      : getConfig(["keys", "browser", "startSession"]);
  }

  function keyLabel(key) {
    return key ? `Key: ${key}` : "";
  }

  function currentData() {
    if (state.mode === "slideshow" && state.slideshow) {
      return state.slideshow;
    }
    return state.browser || { currentPath: "", breadcrumbs: [{ name: "Root", path: "" }], canGoUp: false, parentPath: "", session: { active: false, rootPath: "" } };
  }

  function currentSession() {
    return currentData().session || { active: false, rootPath: "" };
  }

  function getConfig(path) {
    return state.config ? getPath(state.config, path) : "";
  }

  function getPath(source, path) {
    return path.reduce((acc, part) => (acc ? acc[part] : undefined), source);
  }

  function setPath(target, path, value) {
    let current = target;
    for (let i = 0; i < path.length - 1; i += 1) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  function canonicalKey(event) {
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
    if (["escape", "arrowleft", "arrowright", "backspace", "enter", "tab", "delete"].includes(key)) {
      return key;
    }
    return key.length === 1 ? key : "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function showNotice(text, type) {
    state.notice = { text, type: type || "info" };
    render();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();