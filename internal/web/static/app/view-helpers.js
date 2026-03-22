export function createViewHelpers({
  state,
  t,
  escapeHtml,
  keyLabel,
  keyBindingLabel,
  getSettingsValue,
  isCapturePath,
  isCaptureAction,
  normalizeBreadcrumbs,
}) {
  function compactKeyText(label) {
    return String(label || "").trim();
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
    if (action.action === "command") {
      return t("settings.actionType.command");
    }
    return action.label || action.action;
  }

  function utilityButtonHtml(label, detail, action, enabled) {
    return `
      <button class="utility-button secondary-button" data-toolbar-action="${escapeHtml(action)}" ${enabled ? "" : "disabled"}>
        <div>
          <strong>${escapeHtml(label)}</strong>
          ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
        </div>
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

  function settingsSectionHtml(title, fields, options = {}) {
    const { kicker = t("settings.keyBindings"), caption = "" } = options;
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <div>
            <p class="section-kicker">${escapeHtml(kicker)}</p>
            <h3>${escapeHtml(title)}</h3>
          </div>
          ${caption ? `<p class="modal-caption settings-section-caption">${escapeHtml(caption)}</p>` : ""}
        </div>
        <div class="settings-grid">${fields.join("")}</div>
      </section>
    `;
  }

  function settingsFieldHtml(label, path) {
    const value = getSettingsValue(path) || "";
    const captureKey = path.join(".");
    const isCapturing = isCapturePath(path);
    return `
      <div class="settings-field settings-key-row">
        <label>${escapeHtml(label)}</label>
        <button class="capture-row ${isCapturing ? "capturing" : ""}" data-capture-key="${escapeHtml(captureKey)}" type="button">
          <span class="key-value-chip ${isCapturing ? "capturing" : ""}">${escapeHtml(keyBindingLabel(value) || " ")}</span>
          <span class="capture-inline-text">${escapeHtml(isCapturing ? t("settings.pressKey") : t("settings.capture"))}</span>
        </button>
      </div>
    `;
  }

  function settingsActionRowHtml(action, index) {
    const isCapturing = isCaptureAction(index);
    const showTarget = action.action === "move";
    const showCommand = action.action === "command";
    return `
      <div class="settings-row settings-row--action ${isCapturing ? "capturing" : ""} ${showTarget || showCommand ? "settings-row--with-target" : "settings-row--without-target"}">
        <div class="settings-action-inline">
          <span class="settings-action-prefix">${escapeHtml(t("settings.action"))}:</span>
          <div class="settings-select-wrap">
            <select data-action-field="action" data-action-index="${index}">
              ${optionHtml("delete", action.action === "delete")}
              ${optionHtml("restore", action.action === "restore")}
              ${optionHtml("move", action.action === "move")}
              ${optionHtml("command", action.action === "command")}
            </select>
          </div>
          ${showTarget ? `
            <span class="settings-action-separator">${escapeHtml(t("settings.toFolder"))}</span>
            <input data-action-field="target" data-action-index="${index}" value="${escapeHtml(action.target || "")}" placeholder="${escapeHtml(t("settings.targetPlaceholder"))}">
          ` : ""}
          ${showCommand ? `
            <span class="settings-action-separator">${escapeHtml(t("settings.commandLine"))}</span>
            <input data-action-field="command" data-action-index="${index}" value="${escapeHtml(action.command || "")}" placeholder="${escapeHtml(t("settings.commandPlaceholder"))}">
          ` : ""}
        </div>
        <div class="settings-action-tail">
          <button class="secondary-button utility-button settings-danger-button" data-remove-action="${index}">
            ${escapeHtml(t("settings.remove"))}
          </button>
          <button class="capture-row ${isCapturing ? "capturing" : ""}" data-capture-action="${index}" type="button">
            <span class="key-value-chip ${isCapturing ? "capturing" : ""}">${escapeHtml(keyBindingLabel(action.key) || " ")}</span>
            <span class="capture-inline-text">${escapeHtml(isCapturing ? t("settings.pressKey") : t("settings.capture"))}</span>
          </button>
        </div>
      </div>
    `;
  }

  function optionHtml(value, selected) {
    return `<option value="${value}" ${selected ? "selected" : ""}>${escapeHtml(t(`settings.actionType.${value}`))}</option>`;
  }

  return {
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
  };
}

