import {
  canonicalKey,
  clamp,
  clone,
  createAppHelpers,
  escapeHtml,
  getPath,
  normalizeLocale,
  setPath,
} from "./app/helpers.js";
import { MESSAGES } from "./app/messages.js";
import { createEventHandlers } from "./app/events.js";
import { createRenderers } from "./app/renderers.js";
import { createViewHelpers } from "./app/view-helpers.js";

  const STORAGE_KEY = window.__photoManagerBootstrap?.storageKey || "photo-manager.locale";

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

  async function init() {
    await loadBrowser("");
  }

  function t(key, params) {
    const dictionary = MESSAGES[state.locale] || MESSAGES.en;
    const fallback = MESSAGES.en[key] || key;
    const template = dictionary[key] || fallback;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params?.[token] ?? ""));
  }

  const {
    canStartWorkFromBrowser,
    capturePathLabel,
    currentData,
    currentSession,
    currentSlideImage,
    getConfig,
    isCaptureAction,
    isCapturePath,
    isPathAncestor,
    keyLabel,
    normalizeBreadcrumbs,
    normalizeBrowserData,
    normalizeBrowserStatsData,
    normalizeDirectories,
    normalizeImages,
    normalizeSlideshowData,
    normalizeTreeData,
    pathChain,
    pathLabel,
  } = createAppHelpers({ state, t });

  const {
    browserInfoButtonHtml,
    browserInfoKeyHtml,
    browserMiniBreadcrumbHtml,
    browserToolButtonHtml,
    compactKeyText,
    helpRecursiveImageCountText,
    imageCardHtml,
    languageSwitcherHtml,
    metaChipHtml,
    settingsActionRowHtml,
    settingsFieldHtml,
    settingsSectionHtml,
    shortcutGroupHtml,
    shortActionLabel,
    slideBarActionHtml,
    slideBarButtonHtml,
    statPillHtml,
    utilityButtonHtml,
  } = createViewHelpers({
    state,
    t,
    escapeHtml,
    keyLabel,
    getSettingsValue: (path) => getPath(state.settingsDraft, path),
    isCapturePath,
    isCaptureAction,
    normalizeBreadcrumbs,
  });

  let render;
  let renderNotice;
  let bindStaticEvents;
  let bindShellEvents;
  let bindBrowserEvents;
  let bindSlideshowEvents;
  let bindPreviewEvents;
  let bindSettingsEvents;

  const eventHandlers = createEventHandlers({
    state,
    browserView,
    slideshowView,
    previewModal,
    settingsModal,
    helpModal,
    canonicalKey,
    clamp,
    setPath,
    render: () => render(),
    showNotice,
    changeDirectory,
    currentSession,
    openWorkMode,
    endSession,
    openSettings,
    setLocale,
    ensureHelpStats,
    handleTreePathClick,
    toggleTree,
    openPreview,
    runAction,
    movePreview,
    closePreview,
    closeHelp,
    closeSettings,
    saveSettings,
    addAction,
    flushScheduledBrowserLoad,
    moveTreeSelection,
    expandCurrentTreeDirectory,
    collapseCurrentTreeDirectory,
  });

  bindStaticEvents = eventHandlers.bindStaticEvents;
  bindShellEvents = eventHandlers.bindShellEvents;
  bindBrowserEvents = eventHandlers.bindBrowserEvents;
  bindSlideshowEvents = eventHandlers.bindSlideshowEvents;
  bindPreviewEvents = eventHandlers.bindPreviewEvents;
  bindSettingsEvents = eventHandlers.bindSettingsEvents;

  ({ render, renderNotice } = createRenderers({
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
  }));

  bindStaticEvents();
  applyStaticTranslations();
  init().catch((error) => showNotice(error.message, "error"));

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
    if (!key && state.browser && state.browser.currentPath === "") {
      return;
    }
    if (key && hasChildren && state.browser && state.browser.currentPath === key) {
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
    if (!key) {
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
      expanded: true,
    }];
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
    if (!currentRow.path) {
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

  function captureHintText() {
    if (!state.captureTarget) {
      return "";
    }
    if (state.captureTarget.type === "action") {
      return t("capture.action", { index: state.captureTarget.index + 1 });
    }
    return t("capture.field", { label: capturePathLabel(state.captureTarget.path) });
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
