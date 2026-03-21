(function () {
  const STORAGE_KEY = window.__photoManagerBootstrap?.storageKey || "photo-manager.locale";
  const MESSAGES = {
    en: {
      "common.appTitle": "Photo Sorter",
      "common.skipLink": "Skip to main content",
      "common.root": "Browse Root",
      "common.close": "Close",
      "common.preview": "Preview",
      "common.help": "Help",
      "common.language": "Language",
      "common.languageToggle": "Switch language",
      "common.unknown": "(unknown)",
      "common.notStarted": "Not started",
      "common.settings": "Settings",
      "common.status": "Status",
      "shell.sortingWorkspace": "Sorting View",
      "shell.explorerWorkspace": "Folder Browsing",
      "shell.workSessionActive": "Sorting",
      "shell.browsingOnly": "Browsing folders",
      "shell.launchRoot": "Browse range",
      "shell.currentDirectory": "Current folder",
      "shell.workRoot": "Sort starting folder",
      "browser.loading": "Opening folders...",
      "browser.sortHere": "Sort This Folder",
      "browser.reviewHere": "Review This Folder",
      "browser.currentDirectoryAria": "Current folder",
      "browser.noImages": "No photos to sort in this folder.",
      "browser.loadingFolders": "Loading folders...",
      "browser.toggleFolder": "Expand or collapse {name}",
      "browser.openHelp": "Open help",
      "browser.closeHelp": "Close help",
      "browser.checkMovedPhotos": "This folder already contains sorted photos. Review them here.",
      "slideshow.noImages": "No photos",
      "slideshow.noRemainingImages": "No more photos to sort in this folder.",
      "slideshow.sorting": "Sorting",
      "slideshow.reviewingMovedPhotos": "Reviewing",
      "slideshow.prev": "Previous",
      "slideshow.next": "Next",
      "slideshow.end": "Exit Sorting",
      "preview.imagePreview": "Image Preview",
      "preview.close": "Close preview",
      "settings.configuration": "Settings",
      "settings.keysAndActions": "Keys And Actions",
      "settings.browserKeys": "Folder Browsing Keys",
      "settings.previewKeys": "Preview Keys",
      "settings.slideshowKeys": "Sorting View Keys",
      "settings.startSession": "Start Sorting",
      "settings.endSession": "Exit Sorting",
      "settings.treeUp": "Previous Folder",
      "settings.treeDown": "Next Folder",
      "settings.expandDirectory": "Expand Folder",
      "settings.collapseDirectory": "Collapse / Parent Folder",
      "settings.openSettings": "Open Settings",
      "settings.closePreview": "Close Preview",
      "settings.nextPreviewImage": "Next Preview Image",
      "settings.previousPreviewImage": "Previous Preview Image",
      "settings.nextSlide": "Next Photo",
      "settings.previousSlide": "Previous Photo",
      "settings.actions": "Sorting Actions",
      "settings.actionHelp": "Move needs a target folder. Delete and Restore do not use one.",
      "settings.addMove": "Add Move",
      "settings.addDelete": "Add Delete",
      "settings.addRestore": "Add Restore",
      "settings.save": "Save Settings",
      "settings.capture": "Set Key",
      "settings.pressKey": "Press A Key",
      "settings.key": "Key",
      "settings.action": "Action",
      "settings.target": "Target Folder",
      "settings.remove": "Remove",
      "settings.removeAction": "Delete this action row",
      "settings.targetPlaceholder": "0 or D:/Photos/0",
      "settings.saved": "Settings saved.",
      "settings.actionType.move": "Move",
      "settings.actionType.delete": "Delete",
      "settings.actionType.restore": "Restore",
      "help.sortingGuide": "Sorting Guide",
      "help.howToUse": "How To Use",
      "help.shortcuts": "Shortcuts",
      "help.browserShortcuts": "Folder Browsing",
      "help.previewShortcuts": "Preview",
      "help.slideshowShortcuts": "Sorting View",
      "help.actionShortcuts": "Sorting Actions",
      "help.launchRoot": "Browse range",
      "help.currentFolder": "Current folder",
      "help.folders": "Folders here",
      "help.images": "Photos here",
      "help.recursiveImages": "Photos in subfolders",
      "help.loadingRecursiveImages": "Counting...",
      "help.step1": "Browse folders in the tree on the left. Click the current folder again to collapse or reopen it.",
      "help.step2": "Outside Preview and the Sorting View, use Up Arrow and Down Arrow to switch folders, Right Arrow to expand, and Left Arrow to collapse or go to the parent folder.",
      "help.step3": "Click any photo to open Preview only. Sorting does not start until you choose this folder.",
      "help.step4": "Use Sort This Folder to start here. If this folder already contains sorted photos, use Review This Folder instead.",
      "help.step5": "In the Sorting View, use Left Arrow and Right Arrow to move through photos, and Space exits sorting.",
      "help.startReview": "Sort / Review This Folder",
      "help.treeMove": "Previous / Next Folder",
      "help.expand": "Expand Folder",
      "help.collapse": "Collapse / Parent Folder",
      "help.end": "Exit Sorting",
      "help.preview": "Previous / Next In Preview",
      "help.closePreview": "Close Preview",
      "help.slideshowBrowse": "Previous / Next While Sorting",
      "help.openSettings": "Open Settings",
      "capture.action": "Setting key for action {index}. Press one key.",
      "capture.field": "Setting key for {label}. Press one key.",
      "capture.browser.startSession": "start sorting",
      "capture.browser.treeUp": "previous folder",
      "capture.browser.treeDown": "next folder",
      "capture.browser.expandDir": "expand folder",
      "capture.browser.collapseDir": "collapse or go to parent folder",
      "capture.browser.openSettings": "open settings",
      "capture.preview.close": "close preview",
      "capture.preview.next": "next photo in preview",
      "capture.preview.prev": "previous photo in preview",
      "capture.slideshow.next": "next photo while sorting",
      "capture.slideshow.prev": "previous photo while sorting",
      "capture.slideshow.endSession": "exit sorting",
      "busy.working": "Working",
      "busy.loadingFolder": "Opening folder",
      "busy.openingSession": "Starting sorting",
      "busy.endingSession": "Exiting sorting",
      "busy.loadingSettings": "Loading settings",
      "busy.savingSettings": "Saving settings",
      "error.requestFailed": "Request failed.",
      "key.space": "Space",
      "key.escape": "Esc",
      "key.arrowleft": "Left Arrow",
      "key.arrowright": "Right Arrow",
      "key.arrowup": "Up Arrow",
      "key.arrowdown": "Down Arrow",
      "key.backspace": "Backspace",
      "key.enter": "Enter",
      "key.tab": "Tab",
      "key.delete": "Del",
    },
    "zh-CN": {
      "common.appTitle": "照片整理",
      "common.skipLink": "跳到主要内容",
      "common.root": "浏览起点",
      "common.close": "关闭",
      "common.preview": "预览",
      "common.help": "帮助",
      "common.language": "语言",
      "common.languageToggle": "切换语言",
      "common.unknown": "(未知)",
      "common.notStarted": "未开始",
      "common.settings": "设置",
      "common.status": "状态",
      "shell.sortingWorkspace": "整理界面",
      "shell.explorerWorkspace": "文件夹浏览",
      "shell.workSessionActive": "整理中",
      "shell.browsingOnly": "正在浏览",
      "shell.launchRoot": "浏览范围",
      "shell.currentDirectory": "当前文件夹",
      "shell.workRoot": "整理起点",
      "browser.loading": "正在打开文件夹...",
      "browser.sortHere": "整理这个文件夹",
      "browser.reviewHere": "复查这个文件夹",
      "browser.currentDirectoryAria": "当前文件夹",
      "browser.noImages": "这个文件夹里没有可整理的图片。",
      "browser.loadingFolders": "正在读取文件夹...",
      "browser.toggleFolder": "展开或折叠 {name}",
      "browser.openHelp": "打开帮助",
      "browser.closeHelp": "关闭帮助",
      "browser.checkMovedPhotos": "这个文件夹里已经有整理过的图片，可以直接在这里复查。",
      "slideshow.noImages": "没有图片",
      "slideshow.noRemainingImages": "这个文件夹里没有可继续整理的图片。",
      "slideshow.sorting": "整理中",
      "slideshow.reviewingMovedPhotos": "复查中",
      "slideshow.prev": "上一张",
      "slideshow.next": "下一张",
      "slideshow.end": "退出整理",
      "preview.imagePreview": "图片预览",
      "preview.close": "关闭预览",
      "settings.configuration": "设置",
      "settings.keysAndActions": "快捷键与动作",
      "settings.browserKeys": "文件夹浏览快捷键",
      "settings.previewKeys": "预览快捷键",
      "settings.slideshowKeys": "整理界面快捷键",
      "settings.startSession": "开始整理",
      "settings.endSession": "退出整理",
      "settings.treeUp": "上一个文件夹",
      "settings.treeDown": "下一个文件夹",
      "settings.expandDirectory": "展开文件夹",
      "settings.collapseDirectory": "折叠 / 返回父级",
      "settings.openSettings": "打开设置",
      "settings.closePreview": "关闭预览",
      "settings.nextPreviewImage": "预览下一张",
      "settings.previousPreviewImage": "预览上一张",
      "settings.nextSlide": "下一张图片",
      "settings.previousSlide": "上一张图片",
      "settings.actions": "整理动作",
      "settings.actionHelp": "移动需要目标文件夹，删除和恢复不需要。",
      "settings.addMove": "添加移动",
      "settings.addDelete": "添加删除",
      "settings.addRestore": "添加恢复",
      "settings.save": "保存设置",
      "settings.capture": "设置按键",
      "settings.pressKey": "按下按键",
      "settings.key": "按键",
      "settings.action": "动作",
      "settings.target": "目标文件夹",
      "settings.remove": "移除",
      "settings.removeAction": "删除这条动作",
      "settings.targetPlaceholder": "例如 0 或 D:/Photos/0",
      "settings.saved": "设置已保存。",
      "settings.actionType.move": "移动",
      "settings.actionType.delete": "删除",
      "settings.actionType.restore": "恢复",
      "help.sortingGuide": "整理说明",
      "help.howToUse": "使用方法",
      "help.shortcuts": "快捷键",
      "help.browserShortcuts": "文件夹浏览",
      "help.previewShortcuts": "预览",
      "help.slideshowShortcuts": "整理界面",
      "help.actionShortcuts": "整理动作",
      "help.launchRoot": "浏览范围",
      "help.currentFolder": "当前文件夹",
      "help.folders": "当前文件夹里的子文件夹",
      "help.images": "当前文件夹里的图片",
      "help.recursiveImages": "所有子文件夹中的图片",
      "help.loadingRecursiveImages": "统计中...",
      "help.step1": "在左侧文件夹树里浏览文件夹。再次点击当前文件夹可以折叠或重新展开。",
      "help.step2": "不在预览和整理界面时，可用上方向键和下方向键切换文件夹，右方向键展开，左方向键折叠或返回父级。",
      "help.step3": "点击图片只会打开预览，不会直接开始整理。",
      "help.step4": "点“整理这个文件夹”从这里开始；如果这个文件夹里已经有整理过的图片，就点“复查这个文件夹”。",
      "help.step5": "在整理界面中，使用左方向键和右方向键切换图片，默认用空格退出整理。",
      "help.startReview": "整理 / 复查这个文件夹",
      "help.treeMove": "上一个 / 下一个文件夹",
      "help.expand": "展开文件夹",
      "help.collapse": "折叠 / 返回父级",
      "help.end": "退出整理",
      "help.preview": "预览里切换图片",
      "help.closePreview": "关闭预览",
      "help.slideshowBrowse": "整理时切换图片",
      "help.openSettings": "打开设置",
      "capture.action": "正在为动作 {index} 设置按键，请按一个按键。",
      "capture.field": "正在为 {label} 设置按键，请按一个按键。",
      "capture.browser.startSession": "开始整理",
      "capture.browser.treeUp": "上一个文件夹",
      "capture.browser.treeDown": "下一个文件夹",
      "capture.browser.expandDir": "展开文件夹",
      "capture.browser.collapseDir": "折叠或返回父级",
      "capture.browser.openSettings": "打开设置",
      "capture.preview.close": "关闭预览",
      "capture.preview.next": "预览里下一张",
      "capture.preview.prev": "预览里上一张",
      "capture.slideshow.next": "整理时下一张",
      "capture.slideshow.prev": "整理时上一张",
      "capture.slideshow.endSession": "退出整理",
      "busy.working": "处理中",
      "busy.loadingFolder": "正在打开文件夹",
      "busy.openingSession": "正在开始整理",
      "busy.endingSession": "正在退出整理",
      "busy.loadingSettings": "正在加载设置",
      "busy.savingSettings": "正在保存设置",
      "error.requestFailed": "请求失败。",
      "key.space": "空格",
      "key.escape": "Esc",
      "key.arrowleft": "左方向键",
      "key.arrowright": "右方向键",
      "key.arrowup": "上方向键",
      "key.arrowdown": "下方向键",
      "key.backspace": "退格",
      "key.enter": "回车",
      "key.tab": "Tab",
      "key.delete": "Del",
    },
  };

  const state = {
    locale: normalizeLocale(window.__photoManagerBootstrap?.locale) || "en",
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
    helpStats: {
      path: "",
      directoryCount: 0,
      imageCount: 0,
      recursiveImageCount: null,
      loading: false,
    },
    busy: false,
    busyLabel: "",
    tree: {
      nodes: {},
      expanded: { "": true },
      loading: {},
      focusPath: "",
    },
  };

  let noticeTimer = 0;
  let browserLoadTimer = 0;
  let browserLoadToken = 0;

  const browserView = document.getElementById("browserView");
  const slideshowView = document.getElementById("slideshowView");
  const previewModal = document.getElementById("previewModal");
  const settingsModal = document.getElementById("settingsModal");
  const helpModal = document.getElementById("helpModal");

  bindStaticEvents();
  applyStaticTranslations();
  init().catch((error) => showNotice(error.message, "error"));

  async function init() {
    await loadBrowser("");
  }

  function normalizeLocale(raw) {
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

  function t(key, params) {
    const dictionary = MESSAGES[state.locale] || MESSAGES.en;
    const fallback = MESSAGES.en[key] || key;
    const template = dictionary[key] || fallback;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params?.[token] ?? ""));
  }

  function rememberLocale(locale) {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      // Ignore storage failures and keep the current session locale in memory.
    }
  }

  async function setLocale(nextLocale) {
    const locale = normalizeLocale(nextLocale) || "en";
    if (locale === state.locale) {
      return;
    }
    rememberLocale(locale);
    state.locale = locale;
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      noticeTimer = 0;
    }
    state.notice = { type: "info", text: "" };
    applyStaticTranslations();
    if (state.mode === "slideshow" && state.slideshow) {
      await loadSlideshow(state.slideshow.currentPath, state.slideshow.index || 0);
      return;
    }
    if (state.browser) {
      await loadBrowser(state.browser.currentPath || "", { expandTree: false });
      return;
    }
    render();
  }

  function applyStaticTranslations() {
    document.documentElement.lang = state.locale;
    document.title = t("common.appTitle");
    document.getElementById("skipLink").textContent = t("common.skipLink");
    document.getElementById("breadcrumbs").setAttribute("aria-label", t("browser.currentDirectoryAria"));
    document.getElementById("previewKicker").textContent = t("common.preview");
    document.getElementById("previewTitle").textContent = t("preview.imagePreview");
    document.getElementById("previewCloseButton").setAttribute("aria-label", t("preview.close"));
    document.getElementById("settingsKicker").textContent = t("settings.configuration");
    document.getElementById("settingsTitle").textContent = t("settings.keysAndActions");
    document.getElementById("settingsCloseButton").textContent = t("common.close");
    document.getElementById("addMoveActionButton").textContent = t("settings.addMove");
    document.getElementById("addDeleteActionButton").textContent = t("settings.addDelete");
    document.getElementById("addRestoreActionButton").textContent = t("settings.addRestore");
    document.getElementById("saveSettingsButton").textContent = t("settings.save");
    document.getElementById("helpKicker").textContent = t("common.help");
    document.getElementById("helpTitle").textContent = t("help.sortingGuide");
    document.getElementById("helpSettingsButton").setAttribute("aria-label", t("help.openSettings"));
    document.getElementById("helpCloseButton").textContent = t("common.close");
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
    const response = await fetch(path, {
      headers: { "X-Photo-Manager-Locale": state.locale },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || t("error.requestFailed"));
    }
    return data;
  }

  async function apiPost(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Photo-Manager-Locale": state.locale,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || t("error.requestFailed"));
    }
    return data;
  }

  async function withBusy(label, work) {
    if (state.busy) {
      return null;
    }
    state.busy = true;
    state.busyLabel = label || t("busy.working");
    render();
    try {
      return await work();
    } finally {
      state.busy = false;
      state.busyLabel = "";
      render();
    }
  }

  function cancelScheduledBrowserLoad(clearFocus) {
    if (browserLoadTimer) {
      clearTimeout(browserLoadTimer);
      browserLoadTimer = 0;
    }
    if (clearFocus) {
      state.tree.focusPath = "";
    }
  }

  function nextBrowserLoadToken() {
    browserLoadToken += 1;
    return browserLoadToken;
  }

  async function performBrowserLoad(path, options) {
    const settings = options || {};
    const expandTree = settings.expandTree !== false;
    const requestToken = settings.requestToken || browserLoadToken;
    const previousMode = state.mode;
    const previousBrowserPath = state.browser ? state.browser.currentPath : "";
    const hadBrowserState = !!state.browser;
    const data = normalizeBrowserData(await apiGet(`/api/browser?path=${encodeURIComponent(path || "")}`));
    if (requestToken !== browserLoadToken) {
      return;
    }
    state.browser = data;
    state.config = data.config || state.config;
    state.launchRoot = data.launchRoot || state.launchRoot;
    state.mode = "browser";
    syncHelpStatsToBrowser(data);
    browserView.hidden = false;
    slideshowView.hidden = true;
    await syncTreeToCurrentPath(data, { expandTree });
    if (requestToken !== browserLoadToken) {
      return;
    }
    state.tree.focusPath = "";
    if (state.browserHelpOpen) {
      ensureHelpStats().catch((error) => showNotice(error.message, "error"));
    }
    if (data.notice) {
      showNotice(data.notice, "info");
      return;
    }
    if (
      !data.session.active &&
      data.currentDirStartsAsReview &&
      (!hadBrowserState || previousMode !== "browser" || previousBrowserPath !== data.currentPath)
    ) {
      showNotice(t("browser.checkMovedPhotos"), "info");
      return;
    }
    render();
  }

  async function loadBrowser(path, options) {
    cancelScheduledBrowserLoad(false);
    return performBrowserLoad(path, {
      expandTree: true,
      requestToken: nextBrowserLoadToken(),
      ...options,
    });
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

  async function syncTreeToCurrentPath(browserData, options) {
    const settings = {
      expandTree: true,
      ...options,
    };
    cacheTreeNode(browserData.currentPath, browserData.currentName, browserData.directories);
    if (!settings.expandTree) {
      return;
    }
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
      name: name || pathLabel(path, t("common.root")),
      directories: normalizeDirectories(directories),
    };
  }

  function syncHelpStatsToBrowser(browserData) {
    const nextPath = browserData?.currentPath || "";
    const directoryCount = browserData?.directories?.length || 0;
    const imageCount = browserData?.images?.length || 0;
    const previous = state.helpStats || {};
    if (
      previous.path !== nextPath ||
      previous.directoryCount !== directoryCount ||
      previous.imageCount !== imageCount
    ) {
      state.helpStats = {
        path: nextPath,
        directoryCount,
        imageCount,
        recursiveImageCount: null,
        loading: false,
      };
      return;
    }
    state.helpStats = {
      ...previous,
      path: nextPath,
      directoryCount,
      imageCount,
    };
  }

  async function ensureHelpStats() {
    if (!state.browser) {
      return;
    }

    const currentPath = state.browser.currentPath || "";
    syncHelpStatsToBrowser(state.browser);
    if (state.helpStats.loading || state.helpStats.recursiveImageCount !== null) {
      return;
    }

    state.helpStats = {
      ...state.helpStats,
      loading: true,
    };
    render();

    try {
      const data = normalizeBrowserStatsData(await apiGet(`/api/browser/stats?path=${encodeURIComponent(currentPath)}`));
      if (!state.browser || data.currentPath !== (state.browser.currentPath || "")) {
        return;
      }
      state.helpStats = {
        path: data.currentPath,
        directoryCount: data.directoryCount,
        imageCount: data.imageCount,
        recursiveImageCount: data.recursiveImageCount,
        loading: false,
      };
      render();
    } catch (error) {
      if (state.helpStats.path === currentPath) {
        state.helpStats = {
          ...state.helpStats,
          loading: false,
        };
        render();
      }
      throw error;
    }
  }

  async function changeDirectory(path) {
    state.browserHelpOpen = false;
    cancelScheduledBrowserLoad(true);
    return withBusy(t("busy.loadingFolder"), async () => {
      await loadBrowser(path || "", { expandTree: true });
    });
  }

  function currentTreeSelectionPath() {
    if (state.mode === "browser" && state.tree.focusPath) {
      return state.tree.focusPath;
    }
    return state.browser ? state.browser.currentPath : "";
  }

  function parentTreePath(path) {
    const chain = pathChain(path);
    if (chain.length < 2) {
      return "";
    }
    return chain[chain.length - 2];
  }

  function scheduleKeyboardDirectoryLoad(path) {
    const nextPath = path || "";
    cancelScheduledBrowserLoad(false);
    state.browserHelpOpen = false;
    state.tree.focusPath = nextPath;
    const requestToken = nextBrowserLoadToken();
    render();
    browserLoadTimer = window.setTimeout(() => {
      browserLoadTimer = 0;
      performBrowserLoad(nextPath, {
        expandTree: false,
        requestToken,
      }).catch((error) => showNotice(error.message, "error"));
    }, 100);
  }

  async function flushScheduledBrowserLoad() {
    const focusedPath = state.tree.focusPath;
    if (!focusedPath || (state.browser && focusedPath === state.browser.currentPath)) {
      cancelScheduledBrowserLoad(true);
      return;
    }
    cancelScheduledBrowserLoad(false);
    await performBrowserLoad(focusedPath, {
      expandTree: false,
      requestToken: nextBrowserLoadToken(),
    });
  }

  async function handleTreePathClick(path, hasChildren) {
    const key = path || "";
    if (hasChildren && state.browser && state.browser.currentPath === key) {
      await toggleTree(key);
      return;
    }
    await changeDirectory(key);
  }

  async function openWorkMode() {
    await flushScheduledBrowserLoad();
    cancelScheduledBrowserLoad(true);
    if (!canStartWorkFromBrowser()) {
      return null;
    }
    return withBusy(t("busy.openingSession"), async () => {
      const result = await apiPost("/api/session/start", { path: state.browser.currentPath });
      await loadSlideshow(result.slideshowPath || state.browser.currentPath, 0);
    });
  }

  async function endSession() {
    return withBusy(t("busy.endingSession"), async () => {
      await apiPost("/api/session/end", {});
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
    return withBusy(t("busy.working"), async () => {
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
    cancelScheduledBrowserLoad(true);
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

  function rootTreeNode() {
    return state.tree.nodes[""] || {
      name: state.browser ? state.browser.breadcrumbs[0]?.name || state.browser.currentName || t("common.root") : t("common.root"),
      path: "",
      directories: [],
    };
  }

  function visibleTreeRows() {
    if (!state.browser) {
      return [];
    }
    const rootNode = rootTreeNode();
    const rows = [{
      path: "",
      parentPath: "",
      hasChildren: !!rootNode.directories.length || !!state.tree.loading[""],
      expanded: !!state.tree.expanded[""],
    }];
    if (!rows[0].expanded) {
      return rows;
    }
    rows.push(...visibleTreeBranchRows(""));
    return rows;
  }

  function visibleTreeBranchRows(parentPath) {
    const node = state.tree.nodes[parentPath || ""];
    if (!node || !node.directories.length) {
      return [];
    }
    return node.directories.flatMap((entry) => {
      const key = entry.path || "";
      const childNode = state.tree.nodes[key];
      const row = {
        path: key,
        parentPath: parentPath || "",
        hasChildren: !!entry.hasChildren || !!state.tree.loading[key] || (!!childNode && childNode.directories.length > 0),
        expanded: !!state.tree.expanded[key],
      };
      if (!row.expanded) {
        return [row];
      }
      return [row, ...visibleTreeBranchRows(key)];
    });
  }

  function selectedTreePath(rows) {
    const visibleRows = rows || visibleTreeRows();
    const currentPath = currentTreeSelectionPath();
    if (!visibleRows.length) {
      return "";
    }
    if (visibleRows.some((row) => row.path === currentPath)) {
      return currentPath;
    }
    return pathChain(currentPath)
      .reverse()
      .find((path) => visibleRows.some((row) => row.path === path)) || "";
  }

  async function moveTreeSelection(delta) {
    const rows = visibleTreeRows();
    if (!rows.length) {
      return;
    }
    const currentPath = selectedTreePath(rows);
    const currentIndex = rows.findIndex((row) => row.path === currentPath);
    const nextIndex = clamp((currentIndex === -1 ? 0 : currentIndex) + delta, 0, rows.length - 1);
    const nextPath = rows[nextIndex]?.path || "";
    if (nextPath === currentPath) {
      return;
    }
    scheduleKeyboardDirectoryLoad(nextPath);
  }

  async function expandCurrentTreeDirectory() {
    const rows = visibleTreeRows();
    const currentPath = selectedTreePath(rows);
    const currentRow = rows.find((row) => row.path === currentPath);
    if (!currentRow || !currentRow.hasChildren || currentRow.expanded) {
      return;
    }
    await toggleTree(currentRow.path);
  }

  async function collapseCurrentTreeDirectory() {
    const rows = visibleTreeRows();
    const currentPath = selectedTreePath(rows);
    const currentRow = rows.find((row) => row.path === currentPath);
    if (!currentRow) {
      return;
    }
    if (currentRow.expanded) {
      await toggleTree(currentRow.path);
      return;
    }
    if (currentRow.path) {
      scheduleKeyboardDirectoryLoad(currentRow.parentPath);
    }
  }

  async function openSettings() {
    cancelScheduledBrowserLoad(true);
    return withBusy(t("busy.loadingSettings"), async () => {
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
      target: "",
    });
    render();
  }

  async function saveSettings() {
    if (!state.settingsDraft) {
      return null;
    }
    return withBusy(t("busy.savingSettings"), async () => {
      const saved = await apiPost("/api/config", state.settingsDraft);
      state.config = saved;
      state.settingsOpen = false;
      state.captureTarget = null;
      showNotice(t("settings.saved"), "info");
      if (state.mode === "slideshow" && state.slideshow) {
        await loadSlideshow(state.slideshow.currentPath, state.slideshow.index || 0);
        return;
      }
      await loadBrowser(state.browser ? state.browser.currentPath : "");
    });
  }

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
          ${utilityButtonHtml(t("common.settings"), keyLabel(getConfig(["keys", "browser", "openSettings"])), "open-settings", true)}
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
    const rootExpanded = !!state.tree.expanded[""];
    const rootHasChildren = !!rootNode.directories.length || !!state.tree.loading[""];
    const rootToggleMarkup = rootHasChildren
      ? `
          <button class="tree-toggle" data-toggle-tree="" aria-expanded="${rootExpanded}">
            <span class="tree-chevron"></span>
            <span class="visually-hidden">${escapeHtml(t("browser.toggleFolder", { name: rootNode.name || t("common.root") }))}</span>
          </button>
        `
      : `<span class="tree-spacer" aria-hidden="true"></span>`;
    const rootChildrenMarkup = rootExpanded ? renderTreeBranch("", 1) : "";
    return `
      <div class="tree-branch">
        <div class="tree-node">
          <div class="tree-row tree-row--root" style="--depth:0">
            ${rootToggleMarkup}
            <button class="tree-link ${rootClass}" data-tree-path="" data-tree-has-children="${rootHasChildren}">
              <strong>${escapeHtml(rootNode.name || t("common.root"))}</strong>
            </button>
          </div>
        </div>
        ${rootChildrenMarkup}
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
        settingsFieldHtml(t("settings.openSettings"), ["keys", "browser", "openSettings"]),
      ])}
      ${settingsSectionHtml(t("settings.previewKeys"), [
        settingsFieldHtml(t("settings.closePreview"), ["keys", "preview", "close"]),
        settingsFieldHtml(t("settings.nextPreviewImage"), ["keys", "preview", "next"]),
        settingsFieldHtml(t("settings.previousPreviewImage"), ["keys", "preview", "prev"]),
      ])}
      ${settingsSectionHtml(t("settings.slideshowKeys"), [
        settingsFieldHtml(t("settings.nextSlide"), ["keys", "slideshow", "next"]),
        settingsFieldHtml(t("settings.previousSlide"), ["keys", "slideshow", "prev"]),
        settingsFieldHtml(t("settings.endSession"), ["keys", "slideshow", "endSession"]),
      ])}
      <section class="settings-section">
        <h3>${escapeHtml(t("settings.actions"))}</h3>
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
    const helpSettingsKey = compactKeyText(keyLabel(getConfig(["keys", "browser", "openSettings"])));
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
        <span>${escapeHtml(helpSettingsKey)}</span>
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
          ${shortcutGroupHtml(t("help.browserShortcuts"), [
            browserInfoKeyHtml(t("help.startReview"), getConfig(["keys", "browser", "startSession"])),
            browserInfoKeyHtml(t("help.treeMove"), "", treeMoveKeys),
            browserInfoKeyHtml(t("help.expand"), getConfig(["keys", "browser", "expandDir"])),
            browserInfoKeyHtml(t("help.collapse"), getConfig(["keys", "browser", "collapseDir"])),
            browserInfoKeyHtml(t("help.openSettings"), getConfig(["keys", "browser", "openSettings"])),
          ])}
          ${shortcutGroupHtml(t("help.previewShortcuts"), [
            browserInfoKeyHtml(t("help.closePreview"), getConfig(["keys", "preview", "close"])),
            browserInfoKeyHtml(t("help.preview"), "", previewBrowseKeys),
          ])}
          ${shortcutGroupHtml(t("help.slideshowShortcuts"), [
            browserInfoKeyHtml(t("help.slideshowBrowse"), "", slideshowBrowseKeys),
            browserInfoKeyHtml(t("help.end"), getConfig(["keys", "slideshow", "endSession"])),
          ])}
          ${shortcutGroupHtml(t("help.actionShortcuts"), (state.config?.actions || []).map((action) => browserInfoKeyHtml(shortActionLabel(action), action.key)))}
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
        const opening = !state.browserHelpOpen;
        state.browserHelpOpen = opening;
        render();
        if (opening) {
          ensureHelpStats().catch((error) => showNotice(error.message, "error"));
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
      return t("settings.action");
    }
    if (action.action === "delete") {
      return t("settings.actionType.delete");
    }
    if (action.action === "restore") {
      return t("settings.actionType.restore");
    }
    if (action.action === "move") {
      const target = String(action.target || "").replaceAll("\\", "/").split("/").filter(Boolean).pop();
      if (!target) {
        return t("settings.actionType.move");
      }
      return target.length > 14 ? t("settings.actionType.move") : target;
    }
    return action.label || action.action;
  }

  function compactKeyText(label) {
    return String(label || "").trim();
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

  function languageSwitcherHtml() {
    return `
      <div class="language-switcher" role="group" aria-label="${escapeHtml(t("common.languageToggle"))}">
        <button
          class="language-chip ${state.locale === "zh-CN" ? "is-active" : ""}"
          type="button"
          data-toolbar-action="set-locale"
          data-locale="zh-CN"
          ${state.busy ? "disabled" : ""}
        >
          中文
        </button>
        <button
          class="language-chip ${state.locale === "en" ? "is-active" : ""}"
          type="button"
          data-toolbar-action="set-locale"
          data-locale="en"
          ${state.busy ? "disabled" : ""}
        >
          EN
        </button>
      </div>
    `;
  }

  function browserInfoButtonHtml() {
    const expanded = state.browserHelpOpen ? "true" : "false";
    const ariaLabel = state.browserHelpOpen ? t("browser.closeHelp") : t("browser.openHelp");
    return `
      <div class="browser-info">
        <button
          class="browser-icon-button ${state.browserHelpOpen ? "is-active" : ""}"
          type="button"
          aria-label="${escapeHtml(ariaLabel)}"
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

  function shortcutGroupHtml(title, items) {
    return `
      <section class="browser-shortcut-group">
        <h4>${escapeHtml(title)}</h4>
        <div class="browser-shortcut-list">
          ${items.join("")}
        </div>
      </section>
    `;
  }

  function helpRecursiveImageCountText() {
    if (state.helpStats.loading) {
      return t("help.loadingRecursiveImages");
    }
    if (state.helpStats.recursiveImageCount === null || state.helpStats.recursiveImageCount === undefined) {
      return t("common.unknown");
    }
    return String(state.helpStats.recursiveImageCount);
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
            ${escapeHtml(isCapturing ? t("settings.pressKey") : t("settings.capture"))}
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
          <label>${escapeHtml(t("settings.key"))}</label>
          <div class="capture-row">
            <input value="${escapeHtml(action.key || "")}" readonly>
            <button class="secondary-button utility-button capture-button ${isCapturing ? "capturing" : ""}" data-capture-action="${index}">
              ${escapeHtml(isCapturing ? t("settings.pressKey") : t("settings.capture"))}
            </button>
          </div>
        </div>
        <div class="settings-field">
          <label>${escapeHtml(t("settings.action"))}</label>
          <select data-action-field="action" data-action-index="${index}">
            ${optionHtml("move", action.action === "move")}
            ${optionHtml("delete", action.action === "delete")}
            ${optionHtml("restore", action.action === "restore")}
          </select>
        </div>
        <div class="settings-field">
          <label>${escapeHtml(t("settings.target"))}</label>
          <input data-action-field="target" data-action-index="${index}" value="${escapeHtml(action.target || "")}" placeholder="${escapeHtml(t("settings.targetPlaceholder"))}" ${action.action === "move" ? "" : "disabled"}>
        </div>
        <div class="settings-row-actions">
          <button class="action-tile action-tile--compact action-tile--danger" data-remove-action="${index}">
            <strong>${escapeHtml(t("settings.remove"))}</strong>
            <span>${escapeHtml(t("settings.removeAction"))}</span>
          </button>
        </div>
      </div>
    `;
  }

  function optionHtml(value, selected) {
    return `<option value="${value}" ${selected ? "selected" : ""}>${escapeHtml(t(`settings.actionType.${value}`))}</option>`;
  }

  function captureHintText() {
    if (!state.captureTarget) {
      return "";
    }
    if (state.captureTarget.type === "action") {
      return t("capture.action", { index: state.captureTarget.index + 1 });
    }
    return t("capture.field", { label: capturePathLabel(state.captureTarget.path) });
  }

  function capturePathLabel(path) {
    const labelMap = {
      "keys.browser.startSession": t("capture.browser.startSession"),
      "keys.browser.treeUp": t("capture.browser.treeUp"),
      "keys.browser.treeDown": t("capture.browser.treeDown"),
      "keys.browser.expandDir": t("capture.browser.expandDir"),
      "keys.browser.collapseDir": t("capture.browser.collapseDir"),
      "keys.browser.openSettings": t("capture.browser.openSettings"),
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
    if (!state.browser) {
      return false;
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
      directories: normalizeDirectories(data.directories),
    };
  }

  function normalizeBrowserStatsData(data) {
    const numberOrZero = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
      }
      return Math.trunc(numeric);
    };
    return {
      currentPath: data?.currentPath || "",
      directoryCount: numberOrZero(data?.directoryCount),
      imageCount: numberOrZero(data?.imageCount),
      recursiveImageCount: numberOrZero(data?.recursiveImageCount),
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
      ? value.map((entry) => ({ name: entry.name || t("common.root"), path: entry.path || "" }))
      : [{ name: t("common.root"), path: "" }];
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
    return path && path.length ? path : fallback || t("common.root");
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






