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
      const alias = String(action.alias || "").trim();
      if (alias) {
        return alias;
      }
      const target = String(action.target || "").replaceAll("\\", "/").split("/").filter(Boolean).pop();
      if (!target) {
        return t("settings.actionType.move");
      }
      return target.length > 14 ? t("settings.actionType.move") : target;
    }
    if (action.action === "command") {
      const alias = String(action.alias || "").trim();
      if (alias) {
        return alias;
      }
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
    const menuOpen = state.browserImageMenuIndex === index;
    return `
      <article class="image-card ${menuOpen ? "is-menu-open" : ""}" data-gallery-card>
        <button class="image-card-preview" type="button" data-preview-index="${index}">
          <div class="thumb-stage" data-gallery-stage>
            <img class="thumb" data-gallery-image src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}" loading="lazy" decoding="async">
          </div>
        </button>
        <div class="image-meta">
          <button class="image-name-button" type="button" data-preview-index="${index}">
            <strong class="image-name">${escapeHtml(image.name)}</strong>
          </button>
          <div class="image-card-menu-wrap" data-browser-image-menu>
            <button
              class="image-card-menu-toggle"
              type="button"
              aria-label="${escapeHtml(t("browser.moreActions"))}"
              aria-haspopup="menu"
              aria-expanded="${menuOpen ? "true" : "false"}"
              data-browser-image-menu-toggle="${index}"
            >
              ${browserMoreIconHtml()}
            </button>
            <div class="image-card-menu" role="menu" aria-label="${escapeHtml(t("browser.imageActions"))}" ${menuOpen ? "" : "hidden"}>
              <button
                class="image-card-menu-item image-card-menu-item--danger"
                type="button"
                role="menuitem"
                data-browser-image-action="${index}"
                data-browser-image-action-type="delete"
              >
                ${escapeHtml(t("browser.deleteImage"))}
              </button>
            </div>
          </div>
        </div>
      </article>
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

  function browserMoreIconHtml() {
    return `
      <svg class="browser-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="6" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
        <circle cx="12" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
        <circle cx="18" cy="12" r="1.6" style="fill:currentColor;stroke:none"></circle>
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

  function currentBrowserDisplayPath() {
    if (state.browserPending?.active) {
      return state.browserPending.path || "";
    }
    return state.browser?.currentPath || "";
  }

  function fallbackBrowserBreadcrumbs(path) {
    const rootName = normalizeBreadcrumbs(state.browser?.breadcrumbs)[0]?.name || t("common.root");
    const crumbs = [{ name: rootName, path: "" }];
    const parts = String(path || "").split("/").filter(Boolean);
    let current = "";
    parts.forEach((part) => {
      current = current ? `${current}/${part}` : part;
      crumbs.push({ name: part, path: current });
    });
    return crumbs;
  }

  function browserMiniBreadcrumbHtml() {
    const currentPath = currentBrowserDisplayPath();
    const crumbs = state.browserPending?.active
      ? fallbackBrowserBreadcrumbs(currentPath)
      : normalizeBreadcrumbs(state.browser?.breadcrumbs);
    return crumbs.map((crumb) => {
      if (crumb.path === currentPath) {
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

  function commandTemplateHelpHtml() {
    const syntaxItems = [
      "{{ .CurrentFile }}",
      "{{ shell .CurrentFile }}",
      "{{ .CurrentFile | slash | pssingle }}",
    ];
    const functionItems = [
      { name: "shell", description: t("settings.commandTemplateFuncShell") },
      { name: "powershell", description: t("settings.commandTemplateFuncPowershell") },
      { name: "sh", description: t("settings.commandTemplateFuncSh") },
      { name: "slash", description: t("settings.commandTemplateFuncSlash") },
      { name: "urlquery", description: t("settings.commandTemplateFuncURLQuery") },
      { name: "pssingle", description: t("settings.commandTemplateFuncPSSingle") },
      { name: "psdouble", description: t("settings.commandTemplateFuncPSDouble") },
    ];
    const exampleItems = [
      {
        description: t("settings.commandTemplateExampleArg"),
        code: "python script.py {{ shell .CurrentFile }}",
      },
      {
        description: t("settings.commandTemplateExamplePhotos"),
        code: `Start-Process 'ms-photos:viewer?fileName="{{ .CurrentFile | slash | pssingle }}"'`,
      },
    ];

    return `
      <span class="settings-command-help">
        <button
          class="settings-inline-help-button"
          type="button"
          aria-label="${escapeHtml(t("settings.commandTemplateInfoAria"))}"
          aria-haspopup="dialog"
        >
          ${browserInfoIconHtml()}
        </button>
        <div class="settings-command-help-popover" role="note">
          <strong class="settings-command-help-title">${escapeHtml(t("settings.commandTemplateTitle"))}</strong>
          <p class="settings-command-help-copy">${escapeHtml(t("settings.commandTemplateIntro"))}</p>
          <section class="settings-command-help-section">
            <span class="settings-command-help-heading">${escapeHtml(t("settings.commandTemplateSyntax"))}</span>
            <ul class="settings-command-help-list settings-command-help-list--code">
              ${syntaxItems.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("")}
            </ul>
          </section>
          <section class="settings-command-help-section">
            <span class="settings-command-help-heading">${escapeHtml(t("settings.commandTemplateVariables"))}</span>
            <ul class="settings-command-help-list">
              <li><code>.CurrentFile</code><span>${escapeHtml(t("settings.commandTemplateVariableCurrentFile"))}</span></li>
            </ul>
          </section>
          <section class="settings-command-help-section">
            <span class="settings-command-help-heading">${escapeHtml(t("settings.commandTemplateFunctions"))}</span>
            <ul class="settings-command-help-list">
              ${functionItems.map((item) => `
                <li>
                  <code>${escapeHtml(item.name)}</code>
                  <span>${escapeHtml(item.description)}</span>
                </li>
              `).join("")}
            </ul>
          </section>
          <section class="settings-command-help-section">
            <span class="settings-command-help-heading">${escapeHtml(t("settings.commandTemplateExamples"))}</span>
            <ul class="settings-command-help-list settings-command-help-list--examples">
              ${exampleItems.map((item) => `
                <li>
                  <span>${escapeHtml(item.description)}</span>
                  <code>${escapeHtml(item.code)}</code>
                </li>
              `).join("")}
            </ul>
          </section>
        </div>
      </span>
    `;
  }

  function settingsActionRowHtml(action, index, options = {}) {
    const {
      kind = "sorting",
      allowedActions = ["delete", "restore", "move", "command"],
    } = options;
    const isCapturing = isCaptureAction(kind, index);
    const showTarget = action.action === "move";
    const showCommand = action.action === "command";
    const showAlias = action.action === "move" || action.action === "command";
    return `
      <div class="settings-row settings-row--action ${isCapturing ? "capturing" : ""} ${showTarget || showCommand ? "settings-row--with-target" : "settings-row--without-target"}">
        <div class="settings-action-inline">
          <span class="settings-action-prefix">${escapeHtml(t("settings.action"))}:</span>
          <div class="settings-select-wrap">
            <select data-action-kind="${escapeHtml(kind)}" data-action-field="action" data-action-index="${index}">
              ${allowedActions.map((value) => optionHtml(value, action.action === value)).join("")}
            </select>
          </div>
          ${showTarget ? `
            <span class="settings-action-separator">${escapeHtml(t("settings.toFolder"))}</span>
            <input data-action-kind="${escapeHtml(kind)}" data-action-field="target" data-action-index="${index}" value="${escapeHtml(action.target || "")}" placeholder="${escapeHtml(t("settings.targetPlaceholder"))}">
          ` : ""}
          ${showAlias ? `
            <span class="settings-action-separator">${escapeHtml(t("settings.commandAlias"))}</span>
            <input data-action-kind="${escapeHtml(kind)}" data-action-field="alias" data-action-index="${index}" value="${escapeHtml(action.alias || "")}" placeholder="${escapeHtml(t("settings.commandAliasPlaceholder"))}">
          ` : ""}
          ${showCommand ? `
            <span class="settings-command-label">
              <span class="settings-action-separator">${escapeHtml(t("settings.commandLine"))}</span>
              ${commandTemplateHelpHtml()}
            </span>
            <input data-action-kind="${escapeHtml(kind)}" data-action-field="command" data-action-index="${index}" value="${escapeHtml(action.command || "")}" placeholder="${escapeHtml(t("settings.commandPlaceholder"))}">
          ` : ""}
        </div>
        <div class="settings-action-tail">
          <button class="secondary-button utility-button settings-danger-button" data-remove-action="${index}" data-remove-action-kind="${escapeHtml(kind)}">
            ${escapeHtml(t("settings.remove"))}
          </button>
          <button class="capture-row ${isCapturing ? "capturing" : ""}" data-capture-action="${index}" data-capture-action-kind="${escapeHtml(kind)}" type="button">
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
  };
}

