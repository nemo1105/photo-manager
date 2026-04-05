export function createEventHandlers(deps) {
  const {
    state,
    browserView,
    slideshowView,
    previewModal,
    settingsModal,
    helpModal,
    commandTerminalModal,
    canonicalKey,
    clamp,
    setPath,
    render,
    showNotice,
    changeDirectory,
    currentSession,
    openWorkMode,
    endSession,
    openSettings,
    setLocale,
    handleTreePathClick,
    toggleTree,
    openPreview,
    toggleBrowserImageMenu,
    closeBrowserImageMenu,
    toggleBrowserFolderMenu,
    closeBrowserFolderMenu,
    runBrowserImageAction,
    runBrowserFolderAction,
    runAction,
    movePreview,
    closePreview,
    closeHelp,
    closeSettings,
    closeCommandTerminal,
    terminateCommandTerminal,
    saveSettings,
    addAction,
    addBrowserAction,
    flushScheduledBrowserLoad,
    moveTreeSelection,
    expandCurrentTreeDirectory,
    collapseCurrentTreeDirectory,
  } = deps;

  function settingsActionList(kind) {
    if (!state.settingsDraft) {
      return [];
    }
    if (kind === "browser") {
      state.settingsDraft.browserActions = state.settingsDraft.browserActions || [];
      return state.settingsDraft.browserActions;
    }
    state.settingsDraft.actions = state.settingsDraft.actions || [];
    return state.settingsDraft.actions;
  }

  function bindStaticEvents() {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocumentClick);
    document.getElementById("settingsCloseButton").addEventListener("click", closeSettings);
    document.getElementById("helpCloseButton").addEventListener("click", closeHelp);
    document.getElementById("commandTerminalActionButton").addEventListener("click", () => {
      if (state.commandTerminal?.status === "running" || state.commandTerminal?.status === "connecting") {
        terminateCommandTerminal().catch((error) => showNotice(error.message, "error"));
        return;
      }
      closeCommandTerminal().catch((error) => showNotice(error.message, "error"));
    });
    document.getElementById("saveSettingsButton").addEventListener("click", () => {
      saveSettings().catch((error) => showNotice(error.message, "error"));
    });
    previewModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-preview-action]")) {
        return;
      }
      if (event.target.closest(".preview-meta")) {
        return;
      }
      if (event.target.dataset.closePreview === "true") {
        closePreview();
        return;
      }
      if (state.preview.open) {
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
    commandTerminalModal.addEventListener("click", () => {
      if (state.commandTerminal?.open && state.commandTerminal?.terminal?.focus) {
        state.commandTerminal.terminal.focus();
      }
    });
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
            return;
          }
          if (action === "set-locale") {
            await setLocale(button.dataset.locale);
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
        closeBrowserImageMenu();
        closeBrowserFolderMenu();
        state.browserHelpOpen = !state.browserHelpOpen;
        render();
      });
    });
    browserView.querySelectorAll("[data-browser-folder-row]").forEach((row) => {
      if (row.dataset.boundBrowserFolderRow === "true") {
        return;
      }
      row.dataset.boundBrowserFolderRow = "true";
      row.addEventListener("pointerenter", () => {
        setBrowserHoveredFolderPath(row.dataset.browserFolderRow || "");
      });
      row.addEventListener("pointerleave", (event) => {
        const relatedTarget = event.relatedTarget;
        const relatedRow = relatedTarget && typeof relatedTarget.closest === "function"
          ? relatedTarget.closest("[data-browser-folder-row]")
          : null;
        if (relatedRow) {
          setBrowserHoveredFolderPath(relatedRow.dataset.browserFolderRow || "");
          return;
        }
        if ((row.dataset.browserFolderRow || "") === state.browserHoveredFolderPath) {
          setBrowserHoveredFolderPath("");
        }
      });
    });
    browserView.querySelectorAll("[data-tree-path]").forEach((button) => {
      if (button.dataset.boundTreePath === "true") {
        return;
      }
      button.dataset.boundTreePath = "true";
      button.addEventListener("click", () => {
        handleTreePathClick(button.dataset.treePath || "", button.dataset.treeHasChildren === "true")
          .catch((error) => showNotice(error.message, "error"));
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
    browserView.querySelectorAll("[data-browser-image-menu-toggle]").forEach((button) => {
      if (button.dataset.boundBrowserImageMenuToggle === "true") {
        return;
      }
      button.dataset.boundBrowserImageMenuToggle = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        toggleBrowserImageMenu(Number(button.dataset.browserImageMenuToggle));
        syncBrowserImageMenus();
        syncBrowserFolderMenus();
      });
    });
    browserView.querySelectorAll("[data-browser-image-action]").forEach((button) => {
      if (button.dataset.boundBrowserImageAction === "true") {
        return;
      }
      button.dataset.boundBrowserImageAction = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        runBrowserImageAction(
          Number(button.dataset.browserImageAction),
          button.dataset.browserImageActionType,
        ).catch((error) => showNotice(error.message, "error"));
      });
    });
    browserView.querySelectorAll("[data-browser-folder-menu-toggle]").forEach((button) => {
      if (button.dataset.boundBrowserFolderMenuToggle === "true") {
        return;
      }
      button.dataset.boundBrowserFolderMenuToggle = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        toggleBrowserFolderMenu(button.dataset.browserFolderMenuToggle || "");
        syncBrowserFolderMenus();
      });
    });
    browserView.querySelectorAll("[data-browser-folder-action]").forEach((button) => {
      if (button.dataset.boundBrowserFolderAction === "true") {
        return;
      }
      button.dataset.boundBrowserFolderAction = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        runBrowserFolderAction(
          button.dataset.browserFolderAction || "",
          button.dataset.browserFolderActionKey || "",
        ).catch((error) => showNotice(error.message, "error"));
      });
    });
    syncBrowserFolderMenus();
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
    document.querySelectorAll("[data-add-action]").forEach((button) => {
      if (button.dataset.boundAddAction === "true") {
        return;
      }
      button.dataset.boundAddAction = "true";
      button.addEventListener("click", () => {
        if (button.dataset.addActionKind === "browser") {
          addBrowserAction("move");
          return;
        }
        addAction("move");
      });
    });
    document.querySelectorAll("[data-capture-key]").forEach((button) => {
      if (button.dataset.boundCaptureKey === "true") {
        return;
      }
      button.dataset.boundCaptureKey = "true";
      button.addEventListener("click", () => {
        const path = button.dataset.captureKey.split(".");
        const isSameTarget = state.captureTarget
          && state.captureTarget.type === "path"
          && Array.isArray(state.captureTarget.path)
          && state.captureTarget.path.join(".") === path.join(".");
        state.captureTarget = isSameTarget ? null : { type: "path", path };
        render();
      });
    });
    document.querySelectorAll("[data-capture-action]").forEach((button) => {
      if (button.dataset.boundCaptureAction === "true") {
        return;
      }
      button.dataset.boundCaptureAction = "true";
      button.addEventListener("click", () => {
        const index = Number(button.dataset.captureAction);
        const kind = button.dataset.captureActionKind === "browser" ? "browser" : "sorting";
        const isSameTarget = state.captureTarget
          && state.captureTarget.type === "action"
          && state.captureTarget.kind === kind
          && state.captureTarget.index === index;
        state.captureTarget = isSameTarget ? null : { type: "action", kind, index };
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
        const kind = event.target.dataset.actionKind === "browser" ? "browser" : "sorting";
        settingsActionList(kind)[index][field] = event.target.value;
      });
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.actionIndex);
        const field = event.target.dataset.actionField;
        const kind = event.target.dataset.actionKind === "browser" ? "browser" : "sorting";
        const actions = settingsActionList(kind);
        actions[index][field] = event.target.value;
        if (field === "action") {
          if (event.target.value !== "move") {
            actions[index].target = "";
          }
          if (event.target.value !== "command") {
            actions[index].command = "";
          }
          if (event.target.value !== "move" && event.target.value !== "command") {
            actions[index].alias = "";
          }
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
        const kind = button.dataset.removeActionKind === "browser" ? "browser" : "sorting";
        settingsActionList(kind).splice(Number(button.dataset.removeAction), 1);
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
    }
  }

  function onKeyDown(event) {
    const key = canonicalKey(event);
    if (!key) {
      return;
    }

    if (state.commandTerminal?.open) {
      return;
    }

    if (state.captureTarget) {
      event.preventDefault();
      if (state.captureTarget.type === "path") {
        setPath(state.settingsDraft, state.captureTarget.path, key);
      } else if (state.captureTarget.type === "action") {
        settingsActionList(state.captureTarget.kind)[state.captureTarget.index].key = key;
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

    if (state.browserImageMenuIndex !== -1 && key === "escape") {
      event.preventDefault();
      closeBrowserImageMenu();
      syncBrowserImageMenus();
      return;
    }

    if (state.browserFolderMenuPath && key === "escape") {
      event.preventDefault();
      closeBrowserFolderMenu();
      syncBrowserFolderMenus();
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
    if (key === keys.startSession) {
      event.preventDefault();
      flushScheduledBrowserLoad()
        .then(() => openWorkMode())
        .catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.treeUp) {
      event.preventDefault();
      moveTreeSelection(-1).catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.treeDown) {
      event.preventDefault();
      moveTreeSelection(1).catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.expandDir) {
      event.preventDefault();
      expandCurrentTreeDirectory().catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.collapseDir) {
      event.preventDefault();
      collapseCurrentTreeDirectory().catch((error) => showNotice(error.message, "error"));
      return;
    }
    if (key === keys.deleteSelected) {
      event.preventDefault();
      runBrowserFolderAction(state.tree.focusPath || state.browserPending?.path || state.browser.currentPath || "", key)
        .catch((error) => showNotice(error.message, "error"));
      return;
    }

    const folderAction = (state.config?.browserActions || []).find((item) => item.key === key);
    if (folderAction) {
      event.preventDefault();
      runBrowserFolderAction(state.tree.focusPath || state.browserPending?.path || state.browser.currentPath || "", key)
        .catch((error) => showNotice(error.message, "error"));
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

  function onDocumentClick(event) {
    if (state.browserImageMenuIndex !== -1 && !event.target.closest("[data-browser-image-menu]")) {
      closeBrowserImageMenu();
      syncBrowserImageMenus();
    }
    if (state.browserFolderMenuPath && !event.target.closest("[data-browser-folder-menu]")) {
      closeBrowserFolderMenu();
      syncBrowserFolderMenus();
    }
  }

  function syncBrowserImageMenus() {
    browserView.querySelectorAll("[data-browser-image-menu-toggle]").forEach((button) => {
      const index = Number(button.dataset.browserImageMenuToggle);
      const open = index === state.browserImageMenuIndex;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      const card = button.closest("[data-gallery-card]");
      if (card) {
        card.classList.toggle("is-menu-open", open);
      }
      const menuWrap = button.closest("[data-browser-image-menu]");
      const menu = menuWrap ? menuWrap.querySelector(".image-card-menu") : null;
      if (menu) {
        menu.hidden = !open;
      }
    });
  }

  function syncBrowserFolderMenus() {
    browserView.querySelectorAll("[data-browser-folder-menu]").forEach((wrap) => {
      const path = wrap.dataset.browserFolderMenuPath || "";
      const open = path === state.browserFolderMenuPath;
      const visible = open || path === state.browserHoveredFolderPath;
      wrap.classList.toggle("is-open", open);
      wrap.classList.toggle("is-visible", visible);
      const button = wrap.querySelector("[data-browser-folder-menu-toggle]");
      if (button) {
        button.setAttribute("aria-expanded", open ? "true" : "false");
      }
      const menu = wrap.querySelector(".tree-row-menu");
      if (menu) {
        menu.hidden = !open;
      }
    });
  }

  function setBrowserHoveredFolderPath(path) {
    const nextPath = String(path || "");
    if (state.browserHoveredFolderPath === nextPath) {
      return;
    }
    state.browserHoveredFolderPath = nextPath;
    syncBrowserFolderMenus();
  }

  return {
    bindBrowserEvents,
    bindCommandTerminalEvents: () => {},
    bindPreviewEvents,
    bindSettingsEvents,
    bindShellEvents,
    bindSlideshowEvents,
    bindStaticEvents,
  };
}
