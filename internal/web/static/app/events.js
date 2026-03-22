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
    runAction,
    movePreview,
    closePreview,
    closeHelp,
    closeSettings,
    closeCommandTerminal,
    terminateCommandTerminal,
    saveSettings,
    addAction,
    flushScheduledBrowserLoad,
    moveTreeSelection,
    expandCurrentTreeDirectory,
    collapseCurrentTreeDirectory,
  } = deps;

  function bindStaticEvents() {
    document.addEventListener("keydown", onKeyDown);
    document.getElementById("previewCloseButton").addEventListener("click", closePreview);
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
        const isSameTarget = state.captureTarget
          && state.captureTarget.type === "action"
          && state.captureTarget.index === index;
        state.captureTarget = isSameTarget ? null : { type: "action", index };
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
        if (field === "action") {
          if (event.target.value !== "move") {
            state.settingsDraft.actions[index].target = "";
          }
          if (event.target.value !== "command") {
            state.settingsDraft.actions[index].command = "";
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
