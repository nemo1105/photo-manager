export function createRenderers(deps) {
  const {
    state,
    t,
    escapeHtml,
    browserView,
    slideshowView,
    previewModal,
    settingsModal,
    helpModal,
    currentSession,
    currentData,
    pathLabel,
    normalizeBreadcrumbs,
    utilityButtonHtml,
    metaChipHtml,
    browserToolButtonHtml,
    getConfig,
    canStartWorkFromBrowser,
    languageSwitcherHtml,
    browserInfoButtonHtml,
    browserMiniBreadcrumbHtml,
    imageCardHtml,
    rootTreeNode,
    currentTreeSelectionPath,
    isPathAncestor,
    slideBarButtonHtml,
    currentSlideImage,
    slideBarActionHtml,
    settingsSectionHtml,
    settingsFieldHtml,
    settingsActionRowHtml,
    captureHintText,
    compactKeyText,
    keyLabel,
    browserInfoKeyHtml,
    shortcutGroupHtml,
    shortActionLabel,
    statPillHtml,
    helpRecursiveImageCountText,
    bindShellEvents,
    bindBrowserEvents,
    bindSlideshowEvents,
    bindPreviewEvents,
    bindSettingsEvents,
    applyStaticTranslations,
  } = deps;

  function render() {
    applyStaticTranslations();
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
    const title = state.mode === "slideshow" ? t("shell.sortingWorkspace") : t("shell.explorerWorkspace");
    const statusLabel = session.active ? t("shell.workSessionActive") : t("shell.browsingOnly");
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
          <p class="brand-kicker">${escapeHtml(t("common.appTitle"))}</p>
          <div class="brand-title-row">
            <h1 class="shell-title">${escapeHtml(title)}</h1>
            <span class="status-pill ${statusTone}"><strong>${escapeHtml(statusLabel)}</strong></span>
          </div>
        </div>
        <div class="shell-tools">
          ${utilityButtonHtml(t("common.settings"), "", "open-settings", true)}
        </div>
      </div>
      <div class="shell-meta">
        ${metaChipHtml(t("shell.launchRoot"), state.launchRoot || t("common.unknown"))}
        ${metaChipHtml(t("shell.currentDirectory"), pathLabel(current.currentPath, current.currentName || t("common.root")))}
        ${metaChipHtml(t("shell.workRoot"), session.active ? pathLabel(session.rootPath, t("common.root")) : t("common.notStarted"), session.active ? "session" : "")}
        ${state.busy ? metaChipHtml(t("common.status"), state.busyLabel || t("busy.working"), "busy") : ""}
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
    if (!state.notice.text) {
      notice.hidden = true;
      notice.className = "notice";
      notice.innerHTML = "";
      notice.removeAttribute("role");
      delete notice.dataset.text;
      delete notice.dataset.type;
      return;
    }

    const type = state.notice.type === "error" ? "error" : "info";
    if (!notice.hidden && notice.dataset.text === state.notice.text && notice.dataset.type === type) {
      return;
    }

    notice.hidden = false;
    notice.className = `notice ${type}`;
    notice.setAttribute("role", type === "error" ? "alert" : "status");
    notice.dataset.text = state.notice.text;
    notice.dataset.type = type;
    notice.innerHTML = `
      <div class="notice-copy">
        <span class="notice-message">${escapeHtml(state.notice.text)}</span>
      </div>
    `;
  }

  function renderBrowser() {
    if (!state.browser) {
      browserView.innerHTML = `<div class="empty-state">${escapeHtml(t("browser.loading"))}</div>`;
      return;
    }

    const isReviewStart = state.browser.currentDirStartsAsReview;
    const startLabel = isReviewStart ? t("browser.reviewHere") : t("browser.sortHere");

    browserView.innerHTML = `
      <div class="browser-layout">
        <aside class="explorer-pane browser-sidebar">
          <div class="browser-toolbar">
            <div class="browser-tool-group">
              ${browserToolButtonHtml(startLabel, getConfig(["keys", "browser", "startSession"]), "start-work", canStartWorkFromBrowser(), "primary")}
            </div>
            <div class="browser-tool-group browser-tool-group--end">
              ${languageSwitcherHtml()}
              ${browserInfoButtonHtml()}
            </div>
          </div>
          <div class="tree-shell browser-tree-shell">
            ${renderTree()}
          </div>
        </aside>

        <section class="workbench-pane browser-workbench">
          <div class="browser-crumbs" aria-label="${escapeHtml(t("browser.currentDirectoryAria"))}">
            ${browserMiniBreadcrumbHtml()}
          </div>
          <div class="browser-gallery">
            ${state.browser.images.length ? `
              <div class="card-grid browser-card-grid">
                ${state.browser.images.map((image, index) => imageCardHtml(image, index)).join("")}
              </div>
            ` : `<div class="empty-state browser-empty-state">${escapeHtml(t("browser.noImages"))}</div>`}
          </div>
        </section>
      </div>
    `;

    bindShellEvents();
    bindBrowserEvents();
  }

  function renderTree() {
    const rootNode = rootTreeNode();
    const selectedPath = currentTreeSelectionPath();
    const rootClass = selectedPath === "" ? "current" : (isPathAncestor("", selectedPath) ? "ancestor" : "");
    const rootHasChildren = !!rootNode.directories.length || !!state.tree.loading[""];
    return `
      <div class="tree-branch">
        <div class="tree-node">
          <div class="tree-row tree-row--root" style="--depth:0">
            <span class="tree-spacer" aria-hidden="true"></span>
            <button class="tree-link ${rootClass}" data-tree-path="" data-tree-has-children="${rootHasChildren}">
              <strong>${escapeHtml(rootNode.name || t("common.root"))}</strong>
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
      return state.tree.loading[parentPath || ""] ? `<div class="tree-loading muted-text">${escapeHtml(t("browser.loadingFolders"))}</div>` : "";
    }
    if (!node.directories.length) {
      return "";
    }
    return node.directories.map((entry) => renderTreeEntry(entry, depth)).join("");
  }

  function renderTreeEntry(entry, depth) {
    const path = entry.path || "";
    const selectedPath = currentTreeSelectionPath();
    const selected = selectedPath === path;
    const ancestor = !selected && isPathAncestor(path, selectedPath);
    const expanded = !!state.tree.expanded[path];
    const node = state.tree.nodes[path];
    const hasChildren = !!entry.hasChildren || (!!node && node.directories.length > 0);
    const childMarkup = expanded
      ? (node
          ? (node.directories.length ? `<div class="tree-children">${renderTreeBranch(path, depth + 1)}</div>` : "")
          : `<div class="tree-loading muted-text">${escapeHtml(t("browser.loadingFolders"))}</div>`)
      : "";
    const toggleMarkup = hasChildren
      ? `
          <button class="tree-toggle" data-toggle-tree="${escapeHtml(path)}" aria-expanded="${expanded}">
            <span class="tree-chevron"></span>
            <span class="visually-hidden">${escapeHtml(t("browser.toggleFolder", { name: entry.name }))}</span>
          </button>
        `
      : `<span class="tree-spacer" aria-hidden="true"></span>`;

    return `
      <div class="tree-node">
        <div class="tree-row" style="--depth:${depth}">
          ${toggleMarkup}
          <button
            class="tree-link ${selected ? "current" : (ancestor ? "ancestor" : "")}"
            data-tree-path="${escapeHtml(path)}"
            data-tree-has-children="${hasChildren}"
          >
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
    const counterText = current ? `${state.slideshow.index + 1} / ${images.length}` : t("slideshow.noImages");

    slideshowView.innerHTML = `
      <div class="slideshow-layout">
        <section class="slide-stage">
          ${current ? `
            <div class="slide-frame">
              <img class="slide-image" src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
            </div>
          ` : `
            <div class="empty-state slide-empty-state">${escapeHtml(t("slideshow.noRemainingImages"))}</div>
          `}

          <div class="slide-bottom-bar">
            <div class="slide-meta-inline">
              <strong class="slide-file-name">${escapeHtml(current ? current.name : state.slideshow.currentName)}</strong>
              <div class="slide-meta-row">
                <span class="slide-counter">${escapeHtml(counterText)}</span>
                <span class="slide-state-pill">${escapeHtml(t("slideshow.sorting"))}</span>
                ${state.slideshow.currentDirIsTarget ? `<span class="slide-state-pill">${escapeHtml(t("slideshow.reviewingMovedPhotos"))}</span>` : ""}
              </div>
            </div>
            <div class="slide-toolbar">
              <div class="slide-button-group">
                ${slideBarButtonHtml(t("slideshow.prev"), keyLabel(getConfig(["keys", "slideshow", "prev"])), "slide-prev", !!current)}
                ${slideBarButtonHtml(t("slideshow.next"), keyLabel(getConfig(["keys", "slideshow", "next"])), "slide-next", !!current)}
              </div>
              <div class="slide-button-group">
                ${slideBarButtonHtml(t("slideshow.end"), keyLabel(getConfig(["keys", "slideshow", "endSession"])), "end-session", true, "data-toolbar-action")}
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
      ${slideBarButtonHtml(t("slideshow.prev"), keyLabel(getConfig(["keys", "preview", "prev"])), "preview-prev", state.preview.index > 0, "data-preview-action")}
      ${slideBarButtonHtml(t("slideshow.next"), keyLabel(getConfig(["keys", "preview", "next"])), "preview-next", state.preview.index < images.length - 1, "data-preview-action")}
    `;
    bindPreviewEvents();
  }

  function renderSettings() {
    settingsModal.hidden = !state.settingsOpen;
    if (!state.settingsOpen || !state.settingsDraft) {
      return;
    }

    document.getElementById("settingsBody").innerHTML = `
      ${settingsSectionHtml(t("settings.browserKeys"), [
        settingsFieldHtml(t("settings.startSession"), ["keys", "browser", "startSession"]),
        settingsFieldHtml(t("settings.treeUp"), ["keys", "browser", "treeUp"]),
        settingsFieldHtml(t("settings.treeDown"), ["keys", "browser", "treeDown"]),
        settingsFieldHtml(t("settings.expandDirectory"), ["keys", "browser", "expandDir"]),
        settingsFieldHtml(t("settings.collapseDirectory"), ["keys", "browser", "collapseDir"]),
      ], { caption: t("settings.browserKeysHint") })}
      ${settingsSectionHtml(t("settings.previewKeys"), [
        settingsFieldHtml(t("settings.closePreview"), ["keys", "preview", "close"]),
        settingsFieldHtml(t("settings.nextPreviewImage"), ["keys", "preview", "next"]),
        settingsFieldHtml(t("settings.previousPreviewImage"), ["keys", "preview", "prev"]),
      ], { caption: t("settings.previewKeysHint") })}
      ${settingsSectionHtml(t("settings.slideshowKeys"), [
        settingsFieldHtml(t("settings.nextSlide"), ["keys", "slideshow", "next"]),
        settingsFieldHtml(t("settings.previousSlide"), ["keys", "slideshow", "prev"]),
        settingsFieldHtml(t("settings.endSession"), ["keys", "slideshow", "endSession"]),
      ], { caption: t("settings.slideshowKeysHint") })}
      <section class="settings-section">
        <div class="settings-section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t("settings.actionLibrary"))}</p>
            <h3>${escapeHtml(t("settings.actions"))}</h3>
          </div>
          <p class="modal-caption settings-section-caption">${escapeHtml(t("settings.actionsHint"))}</p>
        </div>
        <p class="modal-caption">${escapeHtml(t("settings.actionHelp"))}</p>
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

    const currentPath = currentData().currentPath || t("common.root");
    const treeMoveKeys = [
      compactKeyText(keyLabel(getConfig(["keys", "browser", "treeUp"]))),
      compactKeyText(keyLabel(getConfig(["keys", "browser", "treeDown"]))),
    ].filter(Boolean).join(" / ");
    const previewBrowseKeys = [
      compactKeyText(keyLabel(getConfig(["keys", "preview", "prev"]))),
      compactKeyText(keyLabel(getConfig(["keys", "preview", "next"]))),
    ].filter(Boolean).join(" / ");
    const slideshowBrowseKeys = [
      compactKeyText(keyLabel(getConfig(["keys", "slideshow", "prev"]))),
      compactKeyText(keyLabel(getConfig(["keys", "slideshow", "next"]))),
    ].filter(Boolean).join(" / ");

    document.getElementById("helpSettingsButton").innerHTML = `
      <div>
        <strong>${escapeHtml(t("common.settings"))}</strong>
      </div>
    `;

    document.getElementById("helpBody").innerHTML = `
      <section class="settings-section help-section">
        <h3>${escapeHtml(t("help.howToUse"))}</h3>
        <ol class="browser-help-list">
          <li>${escapeHtml(t("help.step1"))}</li>
          <li>${escapeHtml(t("help.step2"))}</li>
          <li>${escapeHtml(t("help.step3"))}</li>
          <li>${escapeHtml(t("help.step4"))}</li>
          <li>${escapeHtml(t("help.step5"))}</li>
        </ol>
      </section>
      <section class="settings-section help-section">
        <h3>${escapeHtml(t("help.shortcuts"))}</h3>
        <div class="browser-shortcut-groups">
          <div class="browser-shortcut-column">
            ${shortcutGroupHtml(t("help.browserShortcuts"), [
              browserInfoKeyHtml(t("help.startReview"), getConfig(["keys", "browser", "startSession"])),
              browserInfoKeyHtml(t("help.treeMove"), "", treeMoveKeys),
              browserInfoKeyHtml(t("help.expand"), getConfig(["keys", "browser", "expandDir"])),
              browserInfoKeyHtml(t("help.collapse"), getConfig(["keys", "browser", "collapseDir"])),
            ])}
            ${shortcutGroupHtml(t("help.previewShortcuts"), [
              browserInfoKeyHtml(t("help.closePreview"), getConfig(["keys", "preview", "close"])),
              browserInfoKeyHtml(t("help.preview"), "", previewBrowseKeys),
            ])}
          </div>
          <div class="browser-shortcut-column">
            ${shortcutGroupHtml(t("help.slideshowShortcuts"), [
              browserInfoKeyHtml(t("help.slideshowBrowse"), "", slideshowBrowseKeys),
              browserInfoKeyHtml(t("help.end"), getConfig(["keys", "slideshow", "endSession"])),
            ])}
            ${shortcutGroupHtml(t("help.actionShortcuts"), (state.config?.actions || []).map((action) => browserInfoKeyHtml(shortActionLabel(action), action.key)))}
          </div>
        </div>
      </section>
      <section class="settings-section help-section help-section--stats">
        <div class="browser-help-meta-grid">
          <div class="browser-info-section">
            <strong>${escapeHtml(t("help.launchRoot"))}</strong>
            <span>${escapeHtml(state.launchRoot || t("common.unknown"))}</span>
          </div>
          <div class="browser-info-section">
            <strong>${escapeHtml(t("help.currentFolder"))}</strong>
            <span>${escapeHtml(currentPath)}</span>
          </div>
        </div>
        <div class="browser-help-stats">
          ${statPillHtml(t("help.folders"), String(state.helpStats.directoryCount))}
          ${statPillHtml(t("help.images"), String(state.helpStats.imageCount))}
          ${statPillHtml(t("help.recursiveImages"), helpRecursiveImageCountText())}
        </div>
      </section>
    `;
    bindShellEvents();
  }

  return {
    render,
    renderNotice,
  };
}

