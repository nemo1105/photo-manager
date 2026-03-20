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
    browserHelpOpen: false,
    busy: false,
    busyLabel: "",
    tree: {
      nodes: {},
      expanded: { "": true },
      loading: {},
    },
  };

  let noticeTimer = 0;

  const browserView = document.getElementById("browserView");
  const slideshowView = document.getElementById("slideshowView");
  const previewModal = document.getElementById("previewModal");
  const settingsModal = document.getElementById("settingsModal");
  const helpModal = document.getElementById("helpModal");

  bindStaticEvents();
  init().catch((error) => showNotice(error.message, "error"));

  async function init() {
    await loadBrowser("");
  }

  function bindStaticEvents() {
    document.addEventListener("keydown", onKeyDown);
    document.getElementById("previewCloseButton").addEventListener("click", closePreview);
    document.getElementById("settingsCloseButton").addEventListener("click", closeSettings);
    document.getElementById("helpCloseButton").addEventListener("click", closeHelp);
    document.getElementById("saveSettingsButton").addEventListener("click", () => {
      saveSettings().catch((error) => showNotice(error.message, "error"));
    });
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
    helpModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeHelp === "true") {
        closeHelp();
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

  async function withBusy(label, work) {
    if (state.busy) {
      return null;
    }
    state.busy = true;
    state.busyLabel = label || "Working";
    render();
    try {
      return await work();
    } finally {
      state.busy = false;
      state.busyLabel = "";
      render();
    }
  }

  async function loadBrowser(path) {
    const data = normalizeBrowserData(await apiGet(`/api/browser?path=${encodeURIComponent(path || "")}`));
    state.browser = data;
    state.config = data.config || state.config;
    state.launchRoot = data.launchRoot || state.launchRoot;
    state.mode = "browser";
    browserView.hidden = false;
    slideshowView.hidden = true;
    await syncTreeToCurrentPath(data);
    if (data.notice) {
      showNotice(data.notice, "info");
      return;
    }
    render();
  }

  async function loadSlideshow(path, preferredIndex) {
    const data = normalizeSlideshowData(await apiGet(`/api/slideshow?path=${encodeURIComponent(path || "")}`));
    state.slideshow = data;
    state.config = data.config || state.config;
    state.browserHelpOpen = false;
    if (!data.session.active) {
      await loadBrowser(path || "");
      if (data.notice) {
        showNotice(data.notice, "info");
      }
      return;
    }
    state.mode = "slideshow";
    state.slideshow.index = clamp(preferredIndex || 0, 0, Math.max(0, data.images.length - 1));
    browserView.hidden = true;
    slideshowView.hidden = false;
    if (data.notice) {
      showNotice(data.notice, "info");
      return;
    }
    render();
  }

  async function loadTreeNode(path) {
    const key = path || "";
    if (state.tree.nodes[key]) {
      return state.tree.nodes[key];
    }
    if (state.tree.loading[key]) {
      return null;
    }
    state.tree.loading[key] = true;
    render();
    try {
      const data = normalizeTreeData(await apiGet(`/api/tree?path=${encodeURIComponent(key)}`));
      cacheTreeNode(data.currentPath, data.currentName, data.directories);
      return state.tree.nodes[key];
    } finally {
      delete state.tree.loading[key];
      render();
    }
  }

  async function syncTreeToCurrentPath(browserData) {
    cacheTreeNode(browserData.currentPath, browserData.currentName, browserData.directories);
    const chain = pathChain(browserData.currentPath);
    chain.forEach((path) => {
      state.tree.expanded[path] = true;
    });
    for (const ancestor of chain.slice(0, -1)) {
      if (!state.tree.nodes[ancestor]) {
        await loadTreeNode(ancestor);
      }
    }
  }

  function cacheTreeNode(path, name, directories) {
    state.tree.nodes[path || ""] = {
      path: path || "",
      name: name || pathLabel(path, "Root"),
      directories: normalizeDirectories(directories),
    };
  }

  async function changeDirectory(path) {
    state.browserHelpOpen = false;
    return withBusy("Loading folder", async () => {
      await loadBrowser(path || "");
    });
  }

  async function openWorkMode() {
    if (!canStartWorkFromBrowser()) {
      return null;
    }
    return withBusy("Opening work session", async () => {
      const result = await apiPost("/api/session/start", { path: state.browser.currentPath });
      if (result.session && result.session.active && !state.browser.session.active) {
        showNotice("work session started", "info");
      }
      await loadSlideshow(result.slideshowPath || state.browser.currentPath, 0);
    });
  }

  async function backToBrowser() {
    return withBusy("Returning to browser", async () => {
      await loadBrowser(state.slideshow ? state.slideshow.currentPath : "");
    });
  }

  async function endSession() {
    return withBusy("Ending work session", async () => {
      await apiPost("/api/session/end", {});
      showNotice("work session ended", "info");
      const currentPath = state.mode === "slideshow" && state.slideshow
        ? state.slideshow.currentPath
        : (state.browser ? state.browser.currentPath : "");
      await loadBrowser(currentPath);
    });
  }

  async function runAction(actionKey) {
    const currentImage = currentSlideImage();
    if (!currentImage) {
      return null;
    }
    return withBusy(`Running ${actionKey}`, async () => {
      const preferredIndex = state.slideshow.index;
      const result = await apiPost("/api/action", {
        currentPath: state.slideshow.currentPath,
        imagePath: currentImage.path,
        actionKey,
      });
      showNotice(result.notice, "info");
      await loadSlideshow(state.slideshow.currentPath, preferredIndex);
    });
  }

  function openPreview(index) {
    state.browserHelpOpen = false;
    state.preview = {
      open: true,
      images: normalizeImages(state.browser ? state.browser.images : []),
      index: clamp(index, 0, Math.max(0, (state.browser?.images || []).length - 1)),
    };
    render();
  }

  function closePreview() {
    state.preview.open = false;
    render();
  }

  function closeHelp() {
    if (!state.browserHelpOpen) {
      return;
    }
    state.browserHelpOpen = false;
    render();
  }

  function movePreview(delta) {
    if (!state.preview.open || !state.preview.images.length) {
      return;
    }
    state.preview.index = clamp(state.preview.index + delta, 0, state.preview.images.length - 1);
    render();
  }

  async function toggleTree(path) {
    if (state.busy) {
      return;
    }
    const key = path || "";
    if (key === "") {
      state.tree.expanded[""] = true;
      render();
      return;
    }
    if (state.tree.expanded[key]) {
      delete state.tree.expanded[key];
      render();
      return;
    }
    state.tree.expanded[key] = true;
    render();
    if (!state.tree.nodes[key]) {
      await loadTreeNode(key);
    }
  }

  async function openSettings() {
    return withBusy("Loading settings", async () => {
      state.browserHelpOpen = false;
      state.config = await apiGet("/api/config");
      state.settingsDraft = clone(state.config);
      state.settingsOpen = true;
      state.captureTarget = null;
      render();
    });
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
    state.settingsDraft.actions = state.settingsDraft.actions || [];
    state.settingsDraft.actions.push({
      key: "",
      action: type,
      target: type === "move" ? "new-folder" : "",
    });
    render();
  }

  async function saveSettings() {
    if (!state.settingsDraft) {
      return null;
    }
    return withBusy("Saving settings", async () => {
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
    });
  }

  function render() {
    renderShell();
    renderBrowser();
    renderSlideshow();
    renderPreview();
    renderSettings();
    renderHelp();
  }

  function renderShell() {
    const session = currentSession();
    const current = currentData();
    const title = state.mode === "slideshow" ? "Sorting workspace" : "Explorer workspace";
    const statusLabel = session.active ? "Work session active" : "Browsing only";
    const statusTone = session.active ? "session" : "";
    const browserMode = state.mode === "browser";

    document.body.classList.toggle("browser-mode", browserMode);
    document.body.classList.toggle("session-active", !!session.active);
    document.body.classList.toggle("app-busy", !!state.busy);
    document.body.classList.toggle("slideshow-mode", state.mode === "slideshow");

    if (browserMode) {
      document.getElementById("statusBar").innerHTML = "";
      document.getElementById("breadcrumbs").innerHTML = "";
      renderNotice();
      return;
    }

    document.getElementById("statusBar").innerHTML = `
      <div class="shell-strip">
        <div class="brand-stack">
          <p class="brand-kicker">Photo Manager</p>
          <div class="brand-title-row">
            <h1 class="shell-title">${escapeHtml(title)}</h1>
            <span class="status-pill ${statusTone}"><strong>${escapeHtml(statusLabel)}</strong></span>
          </div>
        </div>
        <div class="shell-tools">
          ${utilityButtonHtml("Settings", keyLabel(getConfig(["keys", "browser", "openSettings"])), "open-settings", true)}
        </div>
      </div>
      <div class="shell-meta">
        ${metaChipHtml("Launch root", state.launchRoot || "(unknown)")}
        ${metaChipHtml("Current directory", pathLabel(current.currentPath, current.currentName || "Root"))}
        ${metaChipHtml("Work root", session.active ? pathLabel(session.rootPath, "Root") : "Not started", session.active ? "session" : "")}
        ${state.busy ? metaChipHtml("Status", state.busyLabel || "Working", "busy") : ""}
      </div>
    `;

    document.getElementById("breadcrumbs").innerHTML = normalizeBreadcrumbs(current.breadcrumbs)
      .map((crumb) => `
        <button class="crumb ${crumb.path === current.currentPath ? "current" : ""}" data-browse-path="${escapeHtml(crumb.path)}">
          ${escapeHtml(crumb.name)}
        </button>
      `)
      .join("");

    renderNotice();
  }

  function renderNotice() {
    const notice = document.getElementById("notice");
    if (state.mode === "slideshow" || !state.notice.text) {
      notice.hidden = true;
      notice.className = "notice";
      notice.innerHTML = "";
      notice.removeAttribute("role");
      return;
    }

    const kind = state.notice.type === "error" ? "Error" : "Notice";
    notice.hidden = false;
    notice.className = `notice ${state.notice.type}`;
    notice.setAttribute("role", state.notice.type === "error" ? "alert" : "status");
    notice.innerHTML = `
      <div class="notice-copy notice-toast-copy">
        <strong>${kind}</strong>
        <span>${escapeHtml(state.notice.text)}</span>
      </div>
    `;
  }

  function renderBrowser() {
    if (!state.browser) {
      browserView.innerHTML = `<div class="empty-state">Loading browser...</div>`;
      return;
    }

    const session = currentSession();
    const startLabel = session.active ? "Open Here" : "Sort Here";

    browserView.innerHTML = `
      <div class="browser-layout">
        <aside class="explorer-pane browser-sidebar">
          <div class="browser-toolbar">
            ${browserToolButtonHtml(startLabel, getConfig(["keys", "browser", "startSession"]), "start-work", canStartWorkFromBrowser(), session.active ? "session" : "primary")}
            ${browserInfoButtonHtml()}
          </div>
          <div class="tree-shell browser-tree-shell">
            ${renderTree()}
          </div>
        </aside>

        <section class="workbench-pane browser-workbench">
          <div class="browser-crumbs" aria-label="Current directory">
            ${browserMiniBreadcrumbHtml()}
          </div>
          <div class="browser-gallery">
            ${state.browser.images.length ? `
              <div class="card-grid browser-card-grid">
                ${state.browser.images.map((image, index) => imageCardHtml(image, index)).join("")}
              </div>
            ` : `<div class="empty-state browser-empty-state">No images in this folder.</div>`}
          </div>
        </section>
      </div>
    `;

    bindShellEvents();
    bindBrowserEvents();
  }

  function renderTree() {
    const rootNode = state.tree.nodes[""] || {
      name: state.browser ? state.browser.breadcrumbs[0]?.name || state.browser.currentName || "Root" : "Root",
      path: "",
      directories: [],
    };
    const rootClass = state.browser.currentPath === "" ? "current" : (isPathAncestor("", state.browser.currentPath) ? "ancestor" : "");
    return `
      <div class="tree-branch">
        <div class="tree-node">
          <div class="tree-row tree-row--root" style="--depth:0">
            <button class="tree-link ${rootClass}" data-tree-path="">
              <strong>${escapeHtml(rootNode.name || "Root")}</strong>
            </button>
          </div>
        </div>
        ${renderTreeBranch("", 1)}
      </div>
    `;
  }

  function renderTreeBranch(parentPath, depth) {
    const node = state.tree.nodes[parentPath || ""];
    if (!node) {
      return state.tree.loading[parentPath || ""] ? `<div class="tree-loading muted-text">Loading folders...</div>` : "";
    }
    if (!node.directories.length) {
      return "";
    }
    return node.directories.map((entry) => renderTreeEntry(entry, depth)).join("");
  }

  function renderTreeEntry(entry, depth) {
    const path = entry.path || "";
    const selected = state.browser.currentPath === path;
    const ancestor = !selected && isPathAncestor(path, state.browser.currentPath);
    const expanded = !!state.tree.expanded[path];
    const node = state.tree.nodes[path];
    const hasChildren = !!entry.hasChildren || (!!node && node.directories.length > 0);
    const childMarkup = expanded
      ? (node
          ? (node.directories.length ? `<div class="tree-children">${renderTreeBranch(path, depth + 1)}</div>` : "")
          : `<div class="tree-loading muted-text">Loading folders...</div>`)
      : "";
    const toggleMarkup = hasChildren
      ? `
          <button class="tree-toggle" data-toggle-tree="${escapeHtml(path)}" aria-expanded="${expanded}">
            <span class="tree-chevron"></span>
            <span class="visually-hidden">Toggle ${escapeHtml(entry.name)}</span>
          </button>
        `
      : `<span class="tree-spacer" aria-hidden="true"></span>`;

    return `
      <div class="tree-node">
        <div class="tree-row" style="--depth:${depth}">
          ${toggleMarkup}
          <button class="tree-link ${selected ? "current" : (ancestor ? "ancestor" : "")}" data-tree-path="${escapeHtml(path)}">
            <strong>${escapeHtml(entry.name)}</strong>
          </button>
        </div>
        ${childMarkup}
      </div>
    `;
  }

  function renderSlideshow() {
    if (!state.slideshow || state.mode !== "slideshow") {
      slideshowView.innerHTML = "";
      return;
    }

    const images = state.slideshow.images || [];
    const current = currentSlideImage();
    const counterText = current ? `${state.slideshow.index + 1} / ${images.length}` : "No images";

    slideshowView.innerHTML = `
      <div class="slideshow-layout">
        <section class="slide-stage">
          ${current ? `
            <div class="slide-frame">
              <img class="slide-image" src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
            </div>
          ` : `
            <div class="empty-state slide-empty-state">This directory has no remaining images.</div>
          `}

          ${state.notice.text ? `<div class="slide-toast ${state.notice.type}">${escapeHtml(state.notice.text)}</div>` : ""}

          <div class="slide-bottom-bar">
            <div class="slide-meta-inline">
              <strong class="slide-file-name">${escapeHtml(current ? current.name : state.slideshow.currentName)}</strong>
              <div class="slide-meta-row">
                <span class="slide-counter">${escapeHtml(counterText)}</span>
                <span class="slide-state-pill">Sorting</span>
                ${state.slideshow.currentDirIsTarget ? `<span class="slide-state-pill">Target</span>` : ""}
              </div>
            </div>
            <div class="slide-toolbar">
              <div class="slide-button-group">
                ${slideBarButtonHtml("Prev", keyLabel(getConfig(["keys", "slideshow", "prev"])), "slide-prev", !!current)}
                ${slideBarButtonHtml("Next", keyLabel(getConfig(["keys", "slideshow", "next"])), "slide-next", !!current)}
              </div>
              <div class="slide-button-group">
                ${slideBarButtonHtml("Browser", keyLabel(getConfig(["keys", "slideshow", "backToBrowser"])), "slide-back", true)}
                ${slideBarButtonHtml("End", keyLabel(getConfig(["keys", "slideshow", "endSession"])), "end-session", true, "data-toolbar-action")}
              </div>
              <div class="slide-button-group slide-button-group--actions">
                ${(state.slideshow.actionButtons || []).map((action) => slideBarActionHtml(action, !!current)).join("")}
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    bindShellEvents();
    bindSlideshowEvents();
  }

  function renderPreview() {
    if (!state.preview.open) {
      previewModal.hidden = true;
      return;
    }
    const images = state.preview.images || [];
    const current = images[state.preview.index];
    if (!current) {
      state.preview.open = false;
      previewModal.hidden = true;
      return;
    }

    previewModal.hidden = false;
    document.getElementById("previewBody").innerHTML = `
      <div class="preview-stage">
        <img class="preview-image" src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
      </div>
      <div class="preview-meta">
        <strong>${escapeHtml(current.name)}</strong>
        <span class="muted-text">${state.preview.index + 1} / ${images.length}</span>
      </div>
    `;
    document.getElementById("previewControls").innerHTML = `
      ${slideBarButtonHtml("Prev", keyLabel(getConfig(["keys", "preview", "prev"])), "preview-prev", state.preview.index > 0, "data-preview-action")}
      ${slideBarButtonHtml("Next", keyLabel(getConfig(["keys", "preview", "next"])), "preview-next", state.preview.index < images.length - 1, "data-preview-action")}
    `;
    bindPreviewEvents();
  }

  function renderSettings() {
    settingsModal.hidden = !state.settingsOpen;
    if (!state.settingsOpen || !state.settingsDraft) {
      return;
    }

    document.getElementById("settingsBody").innerHTML = `
      ${settingsSectionHtml("Browser Keys", [
        settingsFieldHtml("Start Session", ["keys", "browser", "startSession"]),
        settingsFieldHtml("End Session", ["keys", "browser", "endSession"]),
        settingsFieldHtml("Up Directory", ["keys", "browser", "upDir"]),
        settingsFieldHtml("Open Settings", ["keys", "browser", "openSettings"]),
      ])}
      ${settingsSectionHtml("Preview Keys", [
        settingsFieldHtml("Close Preview", ["keys", "preview", "close"]),
        settingsFieldHtml("Next Preview Image", ["keys", "preview", "next"]),
        settingsFieldHtml("Previous Preview Image", ["keys", "preview", "prev"]),
      ])}
      ${settingsSectionHtml("Slideshow Keys", [
        settingsFieldHtml("Next Slide", ["keys", "slideshow", "next"]),
        settingsFieldHtml("Previous Slide", ["keys", "slideshow", "prev"]),
        settingsFieldHtml("Back To Browser", ["keys", "slideshow", "backToBrowser"]),
        settingsFieldHtml("End Session", ["keys", "slideshow", "endSession"]),
      ])}
      <section class="settings-section">
        <h3>Actions</h3>
        <p class="modal-caption">Move actions require a target path. Delete and restore do not accept a target.</p>
        ${(state.settingsDraft.actions || []).map((action, index) => settingsActionRowHtml(action, index)).join("")}
      </section>
    `;

    const captureHint = document.getElementById("captureHint");
    captureHint.textContent = captureHintText();
    captureHint.className = `capture-hint ${state.captureTarget ? "capturing" : ""}`;

    bindSettingsEvents();
  }

  function renderHelp() {
    helpModal.hidden = !state.browserHelpOpen;
    if (!state.browserHelpOpen) {
      return;
    }

    const session = currentSession();
    const currentPath = currentData().currentPath || "Root";
    const sessionRoot = session.active ? (session.rootPath || "Root") : "Not started";

    document.getElementById("helpBody").innerHTML = `
      <section class="settings-section help-section">
        <h3>How To Use</h3>
        <ol class="browser-help-list">
          <li>Browse folders in the tree on the left.</li>
          <li>Click any image to open preview only.</li>
          <li>Use Sort Here to start sorting the current folder.</li>
          <li>In slideshow, use Left and Right to move through images.</li>
        </ol>
      </section>
      <section class="settings-section help-section">
        <h3>Shortcuts</h3>
        <div class="browser-info-hotkeys">
          ${browserInfoKeyHtml("Sort", getConfig(["keys", "browser", "startSession"]))}
          ${browserInfoKeyHtml("Up", getConfig(["keys", "browser", "upDir"]))}
          ${browserInfoKeyHtml("End", getConfig(["keys", "browser", "endSession"]))}
          ${browserInfoKeyHtml("Preview", "", `${compactKeyText(keyLabel(getConfig(["keys", "preview", "prev"])))} / ${compactKeyText(keyLabel(getConfig(["keys", "preview", "next"])))}`)}
          ${(state.config?.actions || []).map((action) => browserInfoKeyHtml(shortActionLabel(action), action.key)).join("")}
        </div>
      </section>
      <section class="settings-section help-section">
        <div class="browser-info-section">
          <strong>Workspace</strong>
          <span>${escapeHtml(state.launchRoot || "(unknown)")}</span>
        </div>
        <div class="browser-info-section">
          <strong>Current folder</strong>
          <span>${escapeHtml(currentPath)}</span>
        </div>
        <div class="browser-info-section">
          <strong>Session</strong>
          <span>${escapeHtml(session.active ? `Active | ${sessionRoot}` : "Idle")}</span>
        </div>
        <div class="browser-info-row">
          <span>Folders</span>
          <strong>${escapeHtml(String(state.browser?.directories?.length || 0))}</strong>
        </div>
        <div class="browser-info-row">
          <span>Images</span>
          <strong>${escapeHtml(String(state.browser?.images?.length || 0))}</strong>
        </div>
        <div class="browser-help-actions">
          <button class="browser-help-settings" type="button" data-toolbar-action="open-settings">
            <span>Settings</span>
            <span class="browser-tool-key">${escapeHtml(compactKeyText(keyLabel(getConfig(["keys", "browser", "openSettings"]))))}</span>
          </button>
        </div>
      </section>
    `;
    bindShellEvents();
  }

  function bindShellEvents() {
    document.querySelectorAll("[data-browse-path]").forEach((button) => {
      if (button.dataset.boundBrowse === "true") {
        return;
      }
      button.dataset.boundBrowse = "true";
      button.addEventListener("click", () => {
        changeDirectory(button.dataset.browsePath || "").catch((error) => showNotice(error.message, "error"));
      });
    });
    document.querySelectorAll("[data-toolbar-action]").forEach((button) => {
      if (button.dataset.boundToolbar === "true") {
        return;
      }
      button.dataset.boundToolbar = "true";
      button.addEventListener("click", async () => {
        if (state.busy) {
          return;
        }
        try {
          const action = button.dataset.toolbarAction;
          if (action === "up-dir" && currentData().canGoUp) {
            await changeDirectory(currentData().parentPath || "");
            return;
          }
          if (action === "start-work") {
            await openWorkMode();
            return;
          }
          if (action === "end-session" && currentSession().active) {
            await endSession();
            return;
          }
          if (action === "open-settings") {
            await openSettings();
          }
        } catch (error) {
          showNotice(error.message, "error");
        }
      });
    });
  }

  function bindBrowserEvents() {
    browserView.querySelectorAll("[data-browser-help-toggle]").forEach((button) => {
      if (button.dataset.boundHelpToggle === "true") {
        return;
      }
      button.dataset.boundHelpToggle = "true";
      button.addEventListener("click", () => {
        state.browserHelpOpen = !state.browserHelpOpen;
        render();
      });
    });
    browserView.querySelectorAll("[data-tree-path]").forEach((button) => {
      if (button.dataset.boundTreePath === "true") {
        return;
      }
      button.dataset.boundTreePath = "true";
      button.addEventListener("click", () => {
        changeDirectory(button.dataset.treePath || "").catch((error) => showNotice(error.message, "error"));
      });
    });
    browserView.querySelectorAll("[data-toggle-tree]").forEach((button) => {
      if (button.dataset.boundTreeToggle === "true") {
        return;
      }
      button.dataset.boundTreeToggle = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleTree(button.dataset.toggleTree || "").catch((error) => showNotice(error.message, "error"));
      });
    });
    browserView.querySelectorAll("[data-preview-index]").forEach((button) => {
      if (button.dataset.boundPreviewIndex === "true") {
        return;
      }
      button.dataset.boundPreviewIndex = "true";
      button.addEventListener("click", () => openPreview(Number(button.dataset.previewIndex)));
    });
  }

  function bindSlideshowEvents() {
    slideshowView.querySelectorAll("[data-slideshow-action]").forEach((button) => {
      if (button.dataset.boundSlideshowAction === "true") {
        return;
      }
      button.dataset.boundSlideshowAction = "true";
      button.addEventListener("click", async () => {
        if (state.busy) {
          return;
        }
        try {
          await handleSlideshowAction(button.dataset.slideshowAction);
        } catch (error) {
          showNotice(error.message, "error");
        }
      });
    });
    slideshowView.querySelectorAll("[data-run-action]").forEach((button) => {
      if (button.dataset.boundRunAction === "true") {
        return;
      }
      button.dataset.boundRunAction = "true";
      button.addEventListener("click", () => {
        runAction(button.dataset.runAction).catch((error) => showNotice(error.message, "error"));
      });
    });
  }

  function bindPreviewEvents() {
    document.querySelectorAll("[data-preview-action]").forEach((button) => {
      if (button.dataset.boundPreviewAction === "true") {
        return;
      }
      button.dataset.boundPreviewAction = "true";
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

  function bindSettingsEvents() {
    document.querySelectorAll("[data-capture-key]").forEach((button) => {
      if (button.dataset.boundCaptureKey === "true") {
        return;
      }
      button.dataset.boundCaptureKey = "true";
      button.addEventListener("click", () => {
        state.captureTarget = { type: "path", path: button.dataset.captureKey.split(".") };
        render();
      });
    });
    document.querySelectorAll("[data-capture-action]").forEach((button) => {
      if (button.dataset.boundCaptureAction === "true") {
        return;
      }
      button.dataset.boundCaptureAction = "true";
      button.addEventListener("click", () => {
        state.captureTarget = { type: "action", index: Number(button.dataset.captureAction) };
        render();
      });
    });
    document.querySelectorAll("[data-action-field]").forEach((input) => {
      if (input.dataset.boundActionField === "true") {
        return;
      }
      input.dataset.boundActionField = "true";
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
      if (button.dataset.boundRemoveAction === "true") {
        return;
      }
      button.dataset.boundRemoveAction = "true";
      button.addEventListener("click", () => {
        state.settingsDraft.actions.splice(Number(button.dataset.removeAction), 1);
        render();
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

    if (state.browserHelpOpen) {
      if (key === "escape") {
        event.preventDefault();
        closeHelp();
      }
      return;
    }

    if (state.busy || state.settingsOpen) {
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
    const keys = state.config?.keys?.browser;
    if (!keys || !state.browser) {
      return;
    }
    if (key === keys.startSession && canStartWorkFromBrowser()) {
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
      changeDirectory(state.browser.parentPath || "").catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.openSettings) {
      event.preventDefault();
      openSettings().catch((error) => showNotice(error.message, "error"));
    }
  }

  function handlePreviewKey(key, event) {
    const keys = state.config?.keys?.preview;
    if (!keys) {
      return;
    }
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
    const keys = state.config?.keys?.slideshow;
    if (!keys || !state.slideshow) {
      return;
    }
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

  function utilityButtonHtml(label, detail, action, enabled) {
    return `
      <button class="utility-button secondary-button" data-toolbar-action="${escapeHtml(action)}" ${enabled ? "" : "disabled"}>
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(detail || "")}</span>
        </div>
      </button>
    `;
  }

  function controlTileHtml(label, detail, action, enabled, toneClass) {
    return `
      <button class="control-tile ${toneClass || "secondary-button"}" data-toolbar-action="${escapeHtml(action)}" ${enabled && !state.busy ? "" : "disabled"}>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(detail || "")}</span>
      </button>
    `;
  }

  function railButtonHtml(label, detail, action, enabled, attrName) {
    const attribute = attrName || "data-slideshow-action";
    return `
      <button class="rail-button secondary-button" ${attribute}="${escapeHtml(action)}" ${enabled && !state.busy ? "" : "disabled"}>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(detail || "")}</span>
      </button>
    `;
  }

  function actionTileHtml(action, hasCurrentImage) {
    const classes = ["action-tile", action.action === "delete" ? "action-tile--danger" : "secondary-button"]
      .filter(Boolean)
      .join(" ");
    return `
      <button class="${classes}" data-run-action="${escapeHtml(action.key)}" ${action.enabled && hasCurrentImage && !state.busy ? "" : "disabled"}>
        <strong>${escapeHtml(action.label)}</strong>
        <span>${escapeHtml(keyLabel(action.key))}</span>
      </button>
    `;
  }

  function slideBarButtonHtml(label, detail, action, enabled, attrName) {
    const attribute = attrName || "data-slideshow-action";
    const keyText = compactKeyText(detail);
    return `
      <button class="slide-bar-button" ${attribute}="${escapeHtml(action)}" ${enabled && !state.busy ? "" : "disabled"}>
        <span class="slide-bar-label">${escapeHtml(label)}</span>
        ${keyText ? `<span class="slide-bar-key">${escapeHtml(keyText)}</span>` : ""}
      </button>
    `;
  }

  function slideBarActionHtml(action, hasCurrentImage) {
    const classes = ["slide-bar-button", action.action === "delete" ? "slide-bar-button--danger" : ""]
      .filter(Boolean)
      .join(" ");
    const keyText = compactKeyText(keyLabel(action.key));
    return `
      <button class="${classes}" data-run-action="${escapeHtml(action.key)}" ${action.enabled && hasCurrentImage && !state.busy ? "" : "disabled"}>
        <span class="slide-bar-label">${escapeHtml(shortActionLabel(action))}</span>
        ${keyText ? `<span class="slide-bar-key">${escapeHtml(keyText)}</span>` : ""}
      </button>
    `;
  }

  function shortActionLabel(action) {
    if (!action) {
      return "Action";
    }
    if (action.action === "delete") {
      return "Delete";
    }
    if (action.action === "restore") {
      return "Restore";
    }
    if (action.action === "move") {
      const target = String(action.target || "").replaceAll("\\", "/").split("/").filter(Boolean).pop();
      if (!target) {
        return "Move";
      }
      return target.length > 14 ? "Move" : target;
    }
    return action.label || action.action;
  }

  function compactKeyText(label) {
    return String(label || "").replace(/^Key:\s*/, "");
  }

  function imageCardHtml(image, index) {
    return `
      <button class="image-card" data-preview-index="${index}">
        <div class="thumb-stage">
          <img class="thumb" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}" loading="lazy" decoding="async">
        </div>
        <div class="image-meta">
          <strong class="image-name">${escapeHtml(image.name)}</strong>
        </div>
      </button>
    `;
  }

  function browserToolButtonHtml(label, key, action, enabled, tone) {
    const keyText = compactKeyText(keyLabel(key));
    const toneClass = tone ? ` browser-tool-button--${tone}` : "";
    return `
      <button class="browser-tool-button${toneClass}" type="button" data-toolbar-action="${escapeHtml(action)}" ${enabled && !state.busy ? "" : "disabled"}>
        <span class="browser-tool-label">${escapeHtml(label)}</span>
        ${keyText ? `<span class="browser-tool-key">${escapeHtml(keyText)}</span>` : ""}
      </button>
    `;
  }

  function browserInfoButtonHtml() {
    const expanded = state.browserHelpOpen ? "true" : "false";
    return `
      <div class="browser-info">
        <button
          class="browser-icon-button ${state.browserHelpOpen ? "is-active" : ""}"
          type="button"
          aria-label="Open help"
          aria-expanded="${expanded}"
          aria-controls="helpModal"
          data-browser-help-toggle
        >
          ${browserInfoIconHtml()}
        </button>
      </div>
    `;
  }

  function browserInfoIconHtml() {
    return `
      <svg class="browser-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 10v6"></path>
        <circle cx="12" cy="7.25" r="1"></circle>
      </svg>
    `;
  }

  function browserInfoKeyHtml(label, key, textOverride) {
    const keyText = textOverride || compactKeyText(keyLabel(key));
    return `
      <span class="browser-info-key">
        <strong>${escapeHtml(label)}</strong>
        ${keyText ? `<span>${escapeHtml(keyText)}</span>` : ""}
      </span>
    `;
  }

  function browserMiniBreadcrumbHtml() {
    const crumbs = normalizeBreadcrumbs(state.browser?.breadcrumbs);
    return crumbs.map((crumb) => {
      if (crumb.path === state.browser.currentPath) {
        return `<span class="browser-crumb browser-crumb--current">${escapeHtml(crumb.name)}</span>`;
      }
      return `<button class="browser-crumb" data-browse-path="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</button>`;
    }).join(`<span class="browser-crumb-separator" aria-hidden="true">/</span>`);
  }

  function metaChipHtml(label, value, tone) {
    return `
      <span class="meta-chip ${tone || ""}">
        <span class="meta-chip-copy">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(value)}</span>
        </span>
      </span>
    `;
  }

  function statPillHtml(label, value, tone) {
    return `
      <span class="stat-pill ${tone || ""}">
        <span class="stat-copy">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(value)}</span>
        </span>
      </span>
    `;
  }

  function settingsSectionHtml(title, fields) {
    return `
      <section class="settings-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="settings-grid">${fields.join("")}</div>
      </section>
    `;
  }

  function settingsFieldHtml(label, path) {
    const value = getPath(state.settingsDraft, path) || "";
    const captureKey = path.join(".");
    const isCapturing = isCapturePath(path);
    return `
      <div class="settings-field">
        <label>${escapeHtml(label)}</label>
        <div class="capture-row">
          <input value="${escapeHtml(value)}" readonly>
          <button class="secondary-button utility-button capture-button ${isCapturing ? "capturing" : ""}" data-capture-key="${escapeHtml(captureKey)}">
            ${escapeHtml(isCapturing ? "Press Key" : "Capture")}
          </button>
        </div>
      </div>
    `;
  }

  function settingsActionRowHtml(action, index) {
    const isCapturing = isCaptureAction(index);
    return `
      <div class="settings-row">
        <div class="settings-field">
          <label>Key</label>
          <div class="capture-row">
            <input value="${escapeHtml(action.key || "")}" readonly>
            <button class="secondary-button utility-button capture-button ${isCapturing ? "capturing" : ""}" data-capture-action="${index}">
              ${escapeHtml(isCapturing ? "Press Key" : "Capture")}
            </button>
          </div>
        </div>
        <div class="settings-field">
          <label>Action</label>
          <select data-action-field="action" data-action-index="${index}">
            ${optionHtml("move", action.action === "move")}
            ${optionHtml("delete", action.action === "delete")}
            ${optionHtml("restore", action.action === "restore")}
          </select>
        </div>
        <div class="settings-field">
          <label>Target</label>
          <input data-action-field="target" data-action-index="${index}" value="${escapeHtml(action.target || "")}" placeholder="0 or D:/Photos/0" ${action.action === "move" ? "" : "disabled"}>
        </div>
        <div class="settings-row-actions">
          <button class="action-tile action-tile--compact action-tile--danger" data-remove-action="${index}">
            <strong>Remove</strong>
            <span>Delete this action row</span>
          </button>
        </div>
      </div>
    `;
  }

  function optionHtml(value, selected) {
    return `<option value="${value}" ${selected ? "selected" : ""}>${value}</option>`;
  }

  function captureHintText() {
    if (!state.captureTarget) {
      return "";
    }
    if (state.captureTarget.type === "action") {
      return `Capturing action ${state.captureTarget.index + 1}. Press one key.`;
    }
    return `Capturing ${capturePathLabel(state.captureTarget.path)}. Press one key.`;
  }

  function capturePathLabel(path) {
    const labelMap = {
      "keys.browser.startSession": "browser start session",
      "keys.browser.endSession": "browser end session",
      "keys.browser.upDir": "browser up directory",
      "keys.browser.openSettings": "browser open settings",
      "keys.preview.close": "preview close",
      "keys.preview.next": "preview next",
      "keys.preview.prev": "preview previous",
      "keys.slideshow.next": "slideshow next",
      "keys.slideshow.prev": "slideshow previous",
      "keys.slideshow.backToBrowser": "slideshow back to browser",
      "keys.slideshow.endSession": "slideshow end session",
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
      currentName: "Root",
      breadcrumbs: [{ name: "Root", path: "" }],
      canGoUp: false,
      parentPath: "",
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
    if (!state.browser) {
      return false;
    }
    if (currentSession().active) {
      return true;
    }
    return state.browser.images.length > 0;
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

  function normalizeBrowserData(data) {
    return {
      ...data,
      directories: normalizeDirectories(data.directories),
      images: normalizeImages(data.images),
      breadcrumbs: normalizeBreadcrumbs(data.breadcrumbs),
      session: normalizeSession(data.session),
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
      directories: normalizeDirectories(data.directories),
    };
  }

  function normalizeDirectories(value) {
    return Array.isArray(value)
      ? value.map((entry) => ({
          name: entry.name || "",
          path: entry.path || "",
          hasChildren: !!entry.hasChildren,
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
      ? value.map((entry) => ({ name: entry.name || "Root", path: entry.path || "" }))
      : [{ name: "Root", path: "" }];
  }

  function normalizeSession(value) {
    return value && value.active ? { active: true, rootPath: value.rootPath || "" } : { active: false, rootPath: "" };
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
    return path && path.length ? path : fallback || "Root";
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
    if (["escape", "arrowleft", "arrowright", "arrowup", "arrowdown", "backspace", "enter", "tab", "delete"].includes(key)) {
      return key;
    }
    return key.length === 1 ? key : "";
  }

  function keyLabel(key) {
    if (!key) {
      return "";
    }
    const map = {
      space: "Space",
      escape: "Esc",
      arrowleft: "Left",
      arrowright: "Right",
      arrowup: "Up",
      arrowdown: "Down",
      backspace: "Backspace",
      enter: "Enter",
      tab: "Tab",
      delete: "Del",
    };
    return `Key: ${map[key] || key.toUpperCase()}`;
  }

  function clearNotice() {
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      noticeTimer = 0;
    }
    state.notice = { type: "info", text: "" };
    render();
  }

  function showNotice(text, type) {
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      noticeTimer = 0;
    }
    state.notice = { text, type: type || "info" };
    render();
    if (!text) {
      return;
    }
    const timeoutMs = state.notice.type === "error" ? 4200 : 2200;
    noticeTimer = window.setTimeout(() => {
      if (state.notice.text === text && state.notice.type === (type || "info")) {
        state.notice = { type: "info", text: "" };
        noticeTimer = 0;
        render();
      }
    }, timeoutMs);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();






