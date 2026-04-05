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
    commandTerminalModal,
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
    galleryLayout,
    bindShellEvents,
    bindBrowserEvents,
    bindSlideshowEvents,
    bindPreviewEvents,
    bindSettingsEvents,
    bindCommandTerminalEvents,
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
    renderCommandTerminal();
  }

  function treeDecorationIconHtml(icon) {
    switch (icon) {
      case "check":
      default:
        return `
          <svg class="tree-decoration-svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.25 8.5L6.4 11.55L12.75 4.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        `;
    }
  }

  function treeDecorationsHtml(decorations) {
    if (!Array.isArray(decorations) || !decorations.length) {
      return "";
    }
    const items = decorations
      .map((decoration) => {
        const icon = treeDecorationIconHtml(decoration.icon);
        if (!icon) {
          return "";
        }
        const tooltip = decoration.tooltip
          ? ` title="${escapeHtml(decoration.tooltip)}"`
          : "";
        return `
          <span class="tree-decoration tree-decoration--${escapeHtml(decoration.tone || "neutral")}"${tooltip} aria-hidden="true">
            ${icon}
          </span>
        `;
      })
      .join("");
    if (!items) {
      return "";
    }
    return `<span class="tree-decoration-strip">${items}</span>`;
  }

  function treeLabelHtml(label, imageCount, estimated, decorations, pending) {
    const estimateText = t("browser.estimatedCountTooltip");
    const decorationMarkup = treeDecorationsHtml(decorations);
    const pendingTitle = escapeHtml(t("busy.loadingFolder"));
    return `
      <span class="tree-link-copy">
        ${decorationMarkup}
        <strong>${escapeHtml(label)}</strong>
      </span>
      <span class="tree-count" aria-label="${escapeHtml(t("browser.imageCountAria", { count: imageCount }))}">
        <span class="tree-count-value">${escapeHtml(String(imageCount))}</span>
        ${estimated ? `<span class="tree-count-estimate" title="${escapeHtml(estimateText)}" aria-label="${escapeHtml(estimateText)}">!</span>` : ""}
        ${pending ? `
          <span class="tree-pending-indicator" title="${pendingTitle}" aria-label="${pendingTitle}">
            <span class="visually-hidden">${pendingTitle}</span>
          </span>
        ` : ""}
      </span>
    `;
  }

  function browserFolderActions() {
    return Array.isArray(state.config?.browserActions)
      ? state.config.browserActions.filter((action) => action.action === "move")
      : [];
  }

  function browserFolderActionMenuHtml(path) {
    if (!path) {
      return "";
    }

    const actions = browserFolderActions();
    const deleteKey = getConfig(["keys", "browser", "deleteSelected"]);
    if (!actions.length && !deleteKey) {
      return "";
    }

    const menuOpen = state.browserFolderMenuPath === path;
    return `
      <div class="tree-row-actions ${menuOpen ? "is-open" : ""}" data-browser-folder-menu>
        <button
          class="tree-row-menu-toggle"
          type="button"
          aria-label="${escapeHtml(t("browser.moreActions"))}"
          aria-haspopup="menu"
          aria-expanded="${menuOpen ? "true" : "false"}"
          data-browser-folder-menu-toggle="${escapeHtml(path)}"
        >
          <svg class="browser-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="6" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
            <circle cx="12" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
            <circle cx="18" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
          </svg>
        </button>
        <div class="tree-row-menu" role="menu" aria-label="${escapeHtml(t("browser.folderActions"))}" ${menuOpen ? "" : "hidden"}>
          ${actions.map((action) => `
            <button
              class="tree-row-menu-item"
              type="button"
              role="menuitem"
              data-browser-folder-action="${escapeHtml(path)}"
              data-browser-folder-action-key="${escapeHtml(action.key)}"
            >
              ${escapeHtml(shortActionLabel(action))}
            </button>
          `).join("")}
          ${deleteKey ? `
            <button
              class="tree-row-menu-item tree-row-menu-item--danger"
              type="button"
              role="menuitem"
              data-browser-folder-action="${escapeHtml(path)}"
              data-browser-folder-action-key="${escapeHtml(deleteKey)}"
            >
              ${escapeHtml(t("browser.deleteFolder"))}
            </button>
          ` : ""}
        </div>
      </div>
    `;
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
    document.body.classList.toggle("command-terminal-open", !!state.commandTerminal?.open);

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
      galleryLayout.clear();
      browserView.innerHTML = `<div class="empty-state">${escapeHtml(t("browser.loading"))}</div>`;
      return;
    }

    const isBrowserLoading = !!state.browserPending?.active;
    const browserTargetPath = isBrowserLoading ? state.browserPending.path || "" : state.browser.currentPath;
    const isReviewStart = !isBrowserLoading && state.browser.currentDirStartsAsReview;
    const startLabel = isReviewStart ? t("browser.reviewHere") : t("browser.sortHere");
    const previousTree = browserView.querySelector(".browser-tree-shell");
    const treeScrollTop = previousTree ? previousTree.scrollTop : 0;
    const treeScrollLeft = previousTree ? previousTree.scrollLeft : 0;
    const previousGallery = browserView.querySelector(".browser-gallery");
    const galleryScrollTop = previousGallery ? previousGallery.scrollTop : 0;
    const galleryScrollLeft = previousGallery ? previousGallery.scrollLeft : 0;
    const viewportScrollX = window.scrollX;
    const viewportScrollY = window.scrollY;
    const loadingPath = pathLabel(browserTargetPath, rootTreeNode().name || t("common.root"));

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
            ${isBrowserLoading ? `
              <div class="empty-state browser-empty-state browser-loading-state">
                <strong class="browser-loading-title">${escapeHtml(t("busy.loadingFolder"))}</strong>
                <span class="browser-loading-path">${escapeHtml(loadingPath)}</span>
              </div>
            ` : state.browser.images.length ? `
              <div class="card-grid browser-card-grid" data-browser-gallery>
                ${state.browser.images.map((image, index) => imageCardHtml(image, index)).join("")}
              </div>
            ` : `<div class="empty-state browser-empty-state">${escapeHtml(t("browser.noImages"))}</div>`}
          </div>
        </section>
      </div>
    `;

    const nextGallery = browserView.querySelector(".browser-gallery");
    const nextTree = browserView.querySelector(".browser-tree-shell");
    if (nextTree) {
      nextTree.scrollTop = treeScrollTop;
      nextTree.scrollLeft = treeScrollLeft;
    }
    if (nextGallery) {
      nextGallery.scrollTop = galleryScrollTop;
      nextGallery.scrollLeft = galleryScrollLeft;
    }
    if (window.scrollX !== viewportScrollX || window.scrollY !== viewportScrollY) {
      window.scrollTo(viewportScrollX, viewportScrollY);
    }

    bindShellEvents();
    bindBrowserEvents();
    if (state.mode === "browser" && !isBrowserLoading && state.browser.images.length) {
      galleryLayout.bind(browserView.querySelector("[data-browser-gallery]"));
      return;
    }
    galleryLayout.clear();
  }

  function renderTree() {
    const rootNode = rootTreeNode();
    const selectedPath = currentTreeSelectionPath();
    const rootPending = !!state.browserPending?.active && state.browserPending.path === "";
    const rootClass = selectedPath === "" ? "current" : (isPathAncestor("", selectedPath) ? "ancestor" : "");
    const rootHasChildren = !!rootNode.directories.length || !!state.tree.loading[""];
    return `
      <div class="tree-branch">
        <div class="tree-node">
          <div class="tree-row tree-row--root" style="--depth:0">
            <span class="tree-spacer" aria-hidden="true"></span>
            <button class="tree-link ${rootClass} ${rootPending ? "pending" : ""}" data-tree-path="" data-tree-has-children="${rootHasChildren}">
              ${treeLabelHtml(
                rootNode.name || t("common.root"),
                rootNode.imageCount || 0,
                !!rootNode.imageCountEstimated,
                rootNode.decorations,
                rootPending,
              )}
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
    const pending = !!state.browserPending?.active && state.browserPending.path === path;
    const expanded = !!state.tree.expanded[path];
    const menuOpen = state.browserFolderMenuPath === path;
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
      <div class="tree-node ${menuOpen ? "is-folder-menu-open" : ""}">
        <div class="tree-row ${selected ? "is-selected" : ""}" style="--depth:${depth}">
          ${toggleMarkup}
          <button
            class="tree-link ${selected ? "current" : (ancestor ? "ancestor" : "")} ${pending ? "pending" : ""}"
            data-tree-path="${escapeHtml(path)}"
            data-tree-has-children="${hasChildren}"
          >
            ${treeLabelHtml(entry.name, entry.imageCount || 0, !!entry.imageCountEstimated, entry.decorations, pending)}
          </button>
          ${browserFolderActionMenuHtml(path)}
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
    const actionButtons = state.slideshow.actionButtons || [];
    const fixedActions = actionButtons.filter((action) => action.action === "delete" || action.action === "restore");
    const customActions = actionButtons.filter((action) => action.action !== "delete" && action.action !== "restore");

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
            <div class="slide-meta-stack">
              <div class="slide-meta-row">
                <strong class="slide-file-name">${escapeHtml(current ? current.name : state.slideshow.currentName)}</strong>
                <span class="slide-counter">${escapeHtml(counterText)}</span>
                <span class="slide-state-pill">${escapeHtml(t("slideshow.sorting"))}</span>
                ${state.slideshow.currentDirIsTarget ? `<span class="slide-state-pill">${escapeHtml(t("slideshow.reviewingMovedPhotos"))}</span>` : ""}
              </div>
            </div>
            <div class="slide-toolbar slide-toolbar--fixed">
              <div class="slide-button-group slide-button-group--fixed">
                ${slideBarButtonHtml(t("slideshow.prev"), keyLabel(getConfig(["keys", "slideshow", "prev"])), "slide-prev", !!current)}
                ${slideBarButtonHtml(t("slideshow.next"), keyLabel(getConfig(["keys", "slideshow", "next"])), "slide-next", !!current)}
                ${slideBarButtonHtml(t("slideshow.end"), keyLabel(getConfig(["keys", "slideshow", "endSession"])), "end-session", true, "data-toolbar-action")}
                ${fixedActions.map((action) => slideBarActionHtml(action, !!current)).join("")}
              </div>
            </div>
            ${customActions.length ? `
              <div class="slide-toolbar slide-toolbar--custom">
                <div class="slide-button-group slide-button-group--actions">
                  ${customActions.map((action) => slideBarActionHtml(action, !!current)).join("")}
                </div>
              </div>
            ` : ""}
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
    const canMovePrev = state.preview.index > 0;
    const canMoveNext = state.preview.index < images.length - 1;
    const prevLabel = escapeHtml(t("slideshow.prev"));
    const nextLabel = escapeHtml(t("slideshow.next"));
    const closeLabel = escapeHtml(t("preview.close"));
    document.getElementById("previewBody").innerHTML = `
      <div class="preview-stage">
        <button
          class="preview-hotspot preview-hotspot--prev"
          type="button"
          data-preview-action="preview-prev"
          aria-label="${prevLabel}"
          ${canMovePrev ? "" : "disabled"}
        >
          <svg class="preview-zone-icon" viewBox="0 0 96 96" aria-hidden="true">
            <path d="M58 18 30 48l28 30"></path>
          </svg>
        </button>
        <button
          class="preview-close-zone"
          type="button"
          data-preview-action="preview-close"
          aria-label="${closeLabel}"
        ></button>
        <div class="preview-image-wrap">
          <img class="preview-image" src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">
        </div>
        <button
          class="preview-hotspot preview-hotspot--next"
          type="button"
          data-preview-action="preview-next"
          aria-label="${nextLabel}"
          ${canMoveNext ? "" : "disabled"}
        >
          <svg class="preview-zone-icon" viewBox="0 0 96 96" aria-hidden="true">
            <path d="m38 18 28 30-28 30"></path>
          </svg>
        </button>
        <div class="preview-meta" aria-live="polite">
          <strong title="${escapeHtml(current.name)}">${escapeHtml(current.name)}</strong>
          <span>${state.preview.index + 1} / ${images.length}</span>
        </div>
      </div>
    `;
    bindPreviewEvents();
  }

  function renderSettings() {
    settingsModal.hidden = !state.settingsOpen;
    if (!state.settingsOpen || !state.settingsDraft) {
      return;
    }

    const browserActionRows = (state.settingsDraft.browserActions || [])
      .map((action, index) => settingsActionRowHtml(action, index, {
        kind: "browser",
        allowedActions: ["move"],
      }))
      .join("");

    document.getElementById("settingsBody").innerHTML = `
      <section class="settings-section settings-section--browser">
        <div class="settings-section-head">
          <div>
            <p class="section-kicker">${escapeHtml(t("settings.keyBindings"))}</p>
            <h3>${escapeHtml(t("settings.browserKeys"))}</h3>
          </div>
          <p class="modal-caption settings-section-caption">${escapeHtml(t("settings.browserKeysHint"))}</p>
        </div>
        <div class="settings-grid">
          ${settingsFieldHtml(t("settings.startSession"), ["keys", "browser", "startSession"])}
          ${settingsFieldHtml(t("settings.treeUp"), ["keys", "browser", "treeUp"])}
          ${settingsFieldHtml(t("settings.treeDown"), ["keys", "browser", "treeDown"])}
          ${settingsFieldHtml(t("settings.expandDirectory"), ["keys", "browser", "expandDir"])}
          ${settingsFieldHtml(t("settings.collapseDirectory"), ["keys", "browser", "collapseDir"])}
          ${settingsFieldHtml(t("settings.deleteFolder"), ["keys", "browser", "deleteSelected"])}
        </div>
        <div class="settings-subsection settings-subsection--actions">
          <div class="settings-section-head settings-section-head--nested">
            <div class="settings-section-title-row">
              <p class="section-kicker">${escapeHtml(t("settings.actionLibrary"))}</p>
              <div class="settings-section-title-inline">
                <h3>${escapeHtml(t("settings.browserActions"))}</h3>
                <button class="secondary-button utility-button settings-section-button" type="button" data-add-action data-add-action-kind="browser">
                  ${escapeHtml(t("settings.addAction"))}
                </button>
              </div>
            </div>
            <div class="settings-section-head-actions">
              <p class="modal-caption settings-section-caption">${escapeHtml(t("settings.browserActionsHint"))}</p>
            </div>
          </div>
          ${browserActionRows}
        </div>
      </section>
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
      <section class="settings-section settings-section--actions">
        <div class="settings-section-head">
          <div class="settings-section-title-row">
            <p class="section-kicker">${escapeHtml(t("settings.actionLibrary"))}</p>
            <div class="settings-section-title-inline">
              <h3>${escapeHtml(t("settings.actions"))}</h3>
              <button class="secondary-button utility-button settings-section-button" type="button" data-add-action>
                ${escapeHtml(t("settings.addAction"))}
              </button>
            </div>
          </div>
          <div class="settings-section-head-actions">
            <p class="modal-caption settings-section-caption">${escapeHtml(t("settings.actionsHint"))}</p>
          </div>
        </div>
        ${(state.settingsDraft.actions || []).map((action, index) => settingsActionRowHtml(action, index, {
          kind: "sorting",
          allowedActions: ["delete", "restore", "move", "command"],
        })).join("")}
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

    const browserActionShortcuts = (state.config?.browserActions || [])
      .filter((action) => action.action === "move")
      .map((action) => browserInfoKeyHtml(shortActionLabel(action), action.key));

    document.getElementById("helpSettingsButton").innerHTML = `
      <div>
        <strong>${escapeHtml(t("common.settings"))}</strong>
      </div>
    `;
    document.getElementById("helpCloseButton").innerHTML = `
      <div>
        <strong>${escapeHtml(t("common.close"))}</strong>
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
              browserInfoKeyHtml(t("help.deleteFolder"), getConfig(["keys", "browser", "deleteSelected"])),
            ].concat(browserActionShortcuts))}
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
    `;
    bindShellEvents();
  }

  function renderCommandTerminal() {
    commandTerminalModal.hidden = !state.commandTerminal?.open;
    if (!state.commandTerminal?.open) {
      return;
    }

    const exited = state.commandTerminal.status === "exited" || state.commandTerminal.status === "error";
    const statusLabel = state.commandTerminal.status === "error"
      ? t("command.error")
      : (state.commandTerminal.status === "exited" ? t("command.exited") : (state.commandTerminal.status === "running" ? t("command.running") : t("command.connecting")));
    const detail = state.commandTerminal.status === "connecting"
      ? t("command.waiting")
      : (exited && Number.isFinite(state.commandTerminal.exitCode)
          ? t("command.exitCode", { code: state.commandTerminal.exitCode })
          : t("command.interactive"));
    const workingDir = pathLabel(state.commandTerminal.workingDir, t("common.root"));

    document.getElementById("commandTerminalKicker").textContent = t("command.title");
    document.getElementById("commandTerminalTitle").textContent = state.commandTerminal.title || t("command.title");
    document.getElementById("commandTerminalMeta").textContent = t("command.workingDir", { path: workingDir });
    document.getElementById("commandTerminalStatus").className = `command-terminal-status ${state.commandTerminal.status === "error" ? "is-error" : ""}`;
    document.getElementById("commandTerminalStatus").innerHTML = `
      <strong>${escapeHtml(statusLabel)}</strong>
      <span>${escapeHtml(detail)}</span>
    `;
    document.getElementById("commandTerminalActionButton").innerHTML = `
      <div>
        <strong>${escapeHtml(exited ? t("command.close") : t("command.terminate"))}</strong>
      </div>
    `;

    bindCommandTerminalEvents();
  }

  return {
    render,
    renderNotice,
  };
}

