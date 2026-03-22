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
import {MESSAGES} from "./app/messages.js";
import {createEventHandlers} from "./app/events.js";
import {createGalleryLayout} from "./app/gallery-layout.js";
import {createRenderers} from "./app/renderers.js";
import {createViewHelpers} from "./app/view-helpers.js";
import {Terminal} from "./app/vendor/xterm.mjs";
import {FitAddon} from "./app/vendor/addon-fit.mjs";

function createCommandTerminalState() {
    return {
        open: false,
        sessionId: "",
        title: "",
        workingDir: "",
        status: "idle",
        exitCode: null,
        socket: null,
        socketClosing: false,
        terminal: null,
        fitAddon: null,
        currentPath: "",
        preferredIndex: 0,
    };
}

const STORAGE_KEY = window.__photoManagerBootstrap?.storageKey || "photo-manager.locale";

const state = {
    locale: normalizeLocale(window.__photoManagerBootstrap?.locale) || "en",
    mode: "browser",
    browser: null,
    slideshow: null,
    preview: {open: false, images: [], index: 0},
    browserImageMenuIndex: -1,
    config: null,
    launchRoot: "",
    notice: {type: "info", text: ""},
    settingsOpen: false,
    settingsDraft: null,
    captureTarget: null,
    browserHelpOpen: false,
    commandTerminal: createCommandTerminalState(),
    busy: false,
    busyLabel: "",
    tree: {
        nodes: {},
        expanded: {"": true},
        loading: {},
        focusPath: "",
    },
};

let noticeTimer = 0;
let browserLoadTimer = 0;
let browserLoadToken = 0;
let commandResizeTimer = 0;

const browserView = document.getElementById("browserView");
const slideshowView = document.getElementById("slideshowView");
const previewModal = document.getElementById("previewModal");
const settingsModal = document.getElementById("settingsModal");
const helpModal = document.getElementById("helpModal");
const commandTerminalModal = document.getElementById("commandTerminalModal");

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
} = createAppHelpers({state, t});

const {
    browserInfoButtonHtml,
    browserInfoKeyHtml,
    browserMiniBreadcrumbHtml,
    browserToolButtonHtml,
    compactKeyText,
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
    utilityButtonHtml,
} = createViewHelpers({
    state,
    t,
    escapeHtml,
    keyLabel,
    keyBindingLabel,
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
let bindCommandTerminalEvents;
const galleryLayout = createGalleryLayout();

const eventHandlers = createEventHandlers({
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
    render: () => render(),
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
    runBrowserImageAction,
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
});

bindStaticEvents = eventHandlers.bindStaticEvents;
bindShellEvents = eventHandlers.bindShellEvents;
bindBrowserEvents = eventHandlers.bindBrowserEvents;
bindSlideshowEvents = eventHandlers.bindSlideshowEvents;
bindPreviewEvents = eventHandlers.bindPreviewEvents;
bindSettingsEvents = eventHandlers.bindSettingsEvents;
bindCommandTerminalEvents = eventHandlers.bindCommandTerminalEvents;

({render, renderNotice} = createRenderers({
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
}));

bindStaticEvents();
window.addEventListener("resize", scheduleCommandTerminalResize);
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
    state.notice = {type: "info", text: ""};
    applyStaticTranslations();
    if (state.mode === "slideshow" && state.slideshow) {
        await loadSlideshow(state.slideshow.currentPath, state.slideshow.index || 0);
        return;
    }
    if (state.browser) {
        await loadBrowser(state.browser.currentPath || "", {expandTree: false});
        return;
    }
    render();
}

function applyStaticTranslations() {
    document.documentElement.lang = state.locale;
    document.title = t("common.appTitle");
    document.getElementById("skipLink").textContent = t("common.skipLink");
    document.getElementById("breadcrumbs").setAttribute("aria-label", t("browser.currentDirectoryAria"));
    document.getElementById("previewTitle").textContent = t("preview.imagePreview");
    document.getElementById("settingsKicker").textContent = t("settings.configuration");
    document.getElementById("settingsTitle").textContent = t("settings.keysAndActions");
    document.getElementById("settingsCloseButton").textContent = t("common.close");
    document.getElementById("saveSettingsButton").textContent = t("settings.save");
    document.getElementById("helpKicker").textContent = t("common.help");
    document.getElementById("helpTitle").textContent = t("help.sortingGuide");
    document.getElementById("helpSettingsButton").setAttribute("aria-label", t("help.openSettings"));
    document.getElementById("helpCloseButton").setAttribute("aria-label", t("common.close"));
    document.getElementById("commandTerminalActionButton").setAttribute(
        "aria-label",
        state.commandTerminal?.status === "running" || state.commandTerminal?.status === "connecting"
            ? t("command.terminate")
            : t("command.close"),
    );
}

function closeBrowserImageMenu() {
    state.browserImageMenuIndex = -1;
}

function toggleBrowserImageMenu(index) {
    const nextIndex = Number(index);
    if (!Number.isInteger(nextIndex) || nextIndex < 0) {
        return;
    }
    state.browserHelpOpen = false;
    state.browserImageMenuIndex = state.browserImageMenuIndex === nextIndex ? -1 : nextIndex;
}

async function apiGet(path) {
    const response = await fetch(path, {
        headers: {"X-Photo-Manager-Locale": state.locale},
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

function commandSocketURL(sessionId) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/command/ws?id=${encodeURIComponent(sessionId)}`;
}

function decodeBase64Bytes(value) {
    const raw = window.atob(value || "");
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
        bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
}

function appendCommandTerminalText(text) {
    if (!text || !state.commandTerminal.terminal) {
        return;
    }
    state.commandTerminal.terminal.write(text);
}

function disposeCommandSocket(code, reason) {
    const socket = state.commandTerminal.socket;
    if (!socket) {
        return;
    }
    state.commandTerminal.socketClosing = true;
    state.commandTerminal.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === window.WebSocket.OPEN || socket.readyState === window.WebSocket.CONNECTING) {
        socket.close(code || 1000, reason || "");
    }
    state.commandTerminal.socketClosing = false;
}

function disposeCommandTerminalRuntime() {
    if (state.commandTerminal.fitAddon?.dispose) {
        state.commandTerminal.fitAddon.dispose();
    }
    if (state.commandTerminal.terminal?.dispose) {
        state.commandTerminal.terminal.dispose();
    }
    state.commandTerminal.fitAddon = null;
    state.commandTerminal.terminal = null;
    const viewport = document.getElementById("commandTerminalViewport");
    if (viewport) {
        viewport.innerHTML = "";
    }
}

function sendCommandResize() {
    if (!state.commandTerminal.open || !state.commandTerminal.terminal || !state.commandTerminal.fitAddon) {
        return;
    }
    state.commandTerminal.fitAddon.fit();
    const socket = state.commandTerminal.socket;
    if (!socket || socket.readyState !== window.WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify({
        type: "resize",
        cols: state.commandTerminal.terminal.cols || 0,
        rows: state.commandTerminal.terminal.rows || 0,
    }));
}

function scheduleCommandTerminalResize() {
    if (!state.commandTerminal.open) {
        return;
    }
    if (commandResizeTimer) {
        window.clearTimeout(commandResizeTimer);
    }
    commandResizeTimer = window.setTimeout(() => {
        commandResizeTimer = 0;
        sendCommandResize();
        state.commandTerminal.terminal?.focus();
    }, 40);
}

function ensureCommandTerminalRuntime() {
    if (!state.commandTerminal.open || state.commandTerminal.terminal) {
        return;
    }

    const viewport = document.getElementById("commandTerminalViewport");
    if (!viewport) {
        return;
    }

    viewport.innerHTML = "";

    const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: state.locale === "zh-CN"
            ? "'Cascadia Mono', 'Sarasa Mono SC', 'Consolas', monospace"
            : "'Cascadia Mono', 'IBM Plex Mono', 'Consolas', monospace",
        fontSize: 14,
        scrollback: 5000,
        theme: {
            background: "#0b1220",
            foreground: "#e5edf7",
            cursor: "#f8fafc",
            selectionBackground: "rgba(148, 163, 184, 0.34)",
        },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(viewport);
    fitAddon.fit();
    terminal.onData((data) => {
        const socket = state.commandTerminal.socket;
        if (!socket || socket.readyState !== window.WebSocket.OPEN) {
            return;
        }
        socket.send(JSON.stringify({type: "input", data}));
    });

    state.commandTerminal.terminal = terminal;
    state.commandTerminal.fitAddon = fitAddon;
    terminal.focus();
    scheduleCommandTerminalResize();
}

function connectCommandTerminal() {
    if (!state.commandTerminal.open || !state.commandTerminal.sessionId) {
        return;
    }

    ensureCommandTerminalRuntime();

    const socket = new window.WebSocket(commandSocketURL(state.commandTerminal.sessionId));
    state.commandTerminal.socket = socket;

    socket.onopen = () => {
        state.commandTerminal.status = "running";
        render();
        sendCommandResize();
        state.commandTerminal.terminal?.focus();
    };

    socket.onmessage = (event) => {
        let payload = {};
        try {
            payload = JSON.parse(event.data);
        } catch (error) {
            return;
        }

        if (payload.type === "output" && payload.data) {
            state.commandTerminal.terminal?.write(decodeBase64Bytes(payload.data));
            return;
        }

        if (payload.type === "exit") {
            state.commandTerminal.status = "exited";
            state.commandTerminal.exitCode = Number.isFinite(Number(payload.code)) ? Number(payload.code) : 0;
            render();
            disposeCommandSocket(1000, "command-finished");
            return;
        }

        if (payload.type === "error") {
            state.commandTerminal.status = "error";
            render();
            if (payload.message) {
                appendCommandTerminalText(`\r\n${payload.message}\r\n`);
            }
            disposeCommandSocket(1011, "command-error");
        }
    };

    socket.onerror = () => {
        if (state.commandTerminal.open && state.commandTerminal.status === "connecting") {
            state.commandTerminal.status = "error";
            render();
        }
    };

    socket.onclose = () => {
        if (!state.commandTerminal.open || state.commandTerminal.socketClosing) {
            return;
        }
        state.commandTerminal.socket = null;
        if (state.commandTerminal.status === "running" || state.commandTerminal.status === "connecting") {
            state.commandTerminal.status = "error";
            appendCommandTerminalText(`\r\n${t("command.connectionLost")}\r\n`);
            showNotice(t("command.connectionLost"), "error");
            render();
        }
    };
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
    state.browserImageMenuIndex = -1;
    browserView.hidden = false;
    slideshowView.hidden = true;
    await refreshVisibleTreeNodes(data.currentPath);
    await syncTreeToCurrentPath(data, {expandTree});
    if (requestToken !== browserLoadToken) {
        return;
    }
    state.tree.focusPath = "";
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
    state.browserImageMenuIndex = -1;
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

async function loadTreeNode(path, options) {
    const key = path || "";
    const forceRefresh = !!options?.forceRefresh;
    if (!forceRefresh && state.tree.nodes[key]) {
        return state.tree.nodes[key];
    }
    if (state.tree.loading[key]) {
        return null;
    }
    state.tree.loading[key] = true;
    render();
    try {
        const data = normalizeTreeData(await apiGet(`/api/tree?path=${encodeURIComponent(key)}`));
        cacheTreeNode(
            data.currentPath,
            data.currentName,
            data.directories,
            data.currentImageCount,
            data.currentImageCountEstimated,
            data.currentDecorations,
        );
        return state.tree.nodes[key];
    } finally {
        delete state.tree.loading[key];
        render();
    }
}

async function refreshVisibleTreeNodes(currentPath) {
    const paths = new Set([""]);
    pathChain(currentPath || "").forEach((path) => paths.add(path));
    Object.keys(state.tree.expanded || {}).forEach((path) => {
        paths.add(path || "");
    });
    for (const path of paths) {
        await loadTreeNode(path, {forceRefresh: true});
    }
}

async function syncTreeToCurrentPath(browserData, options) {
    const settings = {
        expandTree: true,
        ...options,
    };
    cacheTreeNode(
        browserData.currentPath,
        browserData.currentName,
        browserData.directories,
        browserData.currentImageCount,
        browserData.currentImageCountEstimated,
        browserData.currentDecorations,
    );
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

function cacheTreeNode(path, name, directories, imageCount, imageCountEstimated, decorations) {
    state.tree.nodes[path || ""] = {
        path: path || "",
        name: name || pathLabel(path, t("common.root")),
        imageCount: Number.isFinite(Number(imageCount)) ? Number(imageCount) : 0,
        imageCountEstimated: !!imageCountEstimated,
        decorations: Array.isArray(decorations) ? decorations : [],
        directories: normalizeDirectories(directories),
    };
}

async function changeDirectory(path) {
    state.browserHelpOpen = false;
    state.browserImageMenuIndex = -1;
    cancelScheduledBrowserLoad(true);
    return withBusy(t("busy.loadingFolder"), async () => {
        await loadBrowser(path || "", {expandTree: true});
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
        const result = await apiPost("/api/session/start", {path: state.browser.currentPath});
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

function openCommandTerminal(result, currentPath, preferredIndex) {
    disposeCommandSocket(1000, "command-restart");
    disposeCommandTerminalRuntime();

    state.commandTerminal = {
        ...createCommandTerminalState(),
        open: true,
        sessionId: result.commandSessionId || "",
        title: result.title || t("command.title"),
        workingDir: result.workingDir || "",
        status: "connecting",
        currentPath: currentPath || "",
        preferredIndex: preferredIndex || 0,
    };
    render();

    window.requestAnimationFrame(() => {
        ensureCommandTerminalRuntime();
        connectCommandTerminal();
    });
}

async function startCommandAction(actionKey, currentImage) {
    return withBusy(t("busy.startingCommand"), async () => {
        const result = await apiPost("/api/command/start", {
            currentPath: state.slideshow.currentPath,
            imagePath: currentImage.path,
            actionKey,
        });
        openCommandTerminal(result, state.slideshow.currentPath, state.slideshow.index);
    });
}

async function runAction(actionKey) {
    const currentImage = currentSlideImage();
    if (!currentImage) {
        return null;
    }
    const action = (state.slideshow?.actionButtons || []).find((item) => item.key === actionKey);
    if (action?.action === "command") {
        return startCommandAction(actionKey, currentImage);
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

async function runBrowserImageAction(index, action) {
    const image = state.browser?.images?.[Number(index)];
    if (!image) {
        return null;
    }

    state.browserImageMenuIndex = -1;
    render();

    return withBusy(t("busy.working"), async () => {
        const result = await apiPost("/api/browser/action", {
            currentPath: state.browser.currentPath,
            imagePath: image.path,
            action,
        });
        showNotice(result.notice, "info");
        await loadBrowser(state.browser.currentPath || "", {expandTree: false});
    });
}

async function terminateCommandTerminal() {
    const socket = state.commandTerminal.socket;
    if (!socket || socket.readyState !== window.WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify({type: "terminate"}));
}

async function closeCommandTerminal() {
    if (!state.commandTerminal.open) {
        return;
    }

    const reloadPath = state.commandTerminal.currentPath;
    const preferredIndex = state.commandTerminal.preferredIndex || 0;

    disposeCommandSocket(1000, "command-close");
    disposeCommandTerminalRuntime();
    state.commandTerminal = createCommandTerminalState();
    render();

    await loadSlideshow(reloadPath, preferredIndex);
}

function openPreview(index) {
    cancelScheduledBrowserLoad(true);
    state.browserHelpOpen = false;
    state.browserImageMenuIndex = -1;
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
        imageCount: 0,
        imageCountEstimated: false,
        decorations: [],
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
        state.settingsDraft.actions = sortSettingsActions(state.settingsDraft.actions || []);
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

function sortSettingsActions(actions) {
    const priority = {delete: 0, restore: 1, move: 2, command: 3};
    return (actions || []).sort((left, right) => {
        const leftPriority = priority[left.action] ?? 99;
        const rightPriority = priority[right.action] ?? 99;
        if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
        }
        return 0;
    });
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
        command: "",
        alias: "",
    });
    sortSettingsActions(state.settingsDraft.actions);
    render();
}

async function saveSettings() {
    if (!state.settingsDraft) {
        return null;
    }
    return withBusy(t("busy.savingSettings"), async () => {
        state.settingsDraft.actions = sortSettingsActions(state.settingsDraft.actions || []);
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
        return t("capture.action", {index: state.captureTarget.index + 1});
    }
    return t("capture.field", {label: capturePathLabel(state.captureTarget.path)});
}

function clearNotice() {
    if (noticeTimer) {
        clearTimeout(noticeTimer);
        noticeTimer = 0;
    }
    state.notice = {type: "info", text: ""};
    render();
}

function showNotice(text, type) {
    if (noticeTimer) {
        clearTimeout(noticeTimer);
        noticeTimer = 0;
    }
    state.notice = {text, type: type || "info"};
    render();
    if (!text) {
        return;
    }
    const timeoutMs = state.notice.type === "error" ? 4200 : 2200;
    noticeTimer = window.setTimeout(() => {
        if (state.notice.text === text && state.notice.type === (type || "info")) {
            state.notice = {type: "info", text: ""};
            noticeTimer = 0;
            render();
        }
    }, timeoutMs);
}
