const FALLBACK_RATIO = 1;
const PORTRAIT_TARGET_WIDTH = 350;
const LANDSCAPE_TARGET_HEIGHT = 350;
const MAX_LANDSCAPE_SPAN = 5;
const DESKTOP_TRACK_WIDTH = 168;
const TABLET_TRACK_WIDTH = 160;
const MOBILE_TRACK_WIDTH = 140;
const MIN_DISTRIBUTED_GAP = 12;

export function createGalleryLayout() {
  const state = {
    grid: null,
    resizeObserver: null,
    frame: 0,
  };

  function clear() {
    if (state.frame) {
      window.cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }
    state.grid = null;
  }

  function bind(grid) {
    if (!(grid instanceof window.HTMLElement)) {
      clear();
      return;
    }
    if (state.grid !== grid) {
      clear();
      state.grid = grid;
      state.resizeObserver = new window.ResizeObserver(() => schedule());
      state.resizeObserver.observe(grid);
    }
    attachImageListeners(grid);
    schedule();
  }

  function attachImageListeners(grid) {
    grid.querySelectorAll("[data-gallery-image]").forEach((image) => {
      if (image.dataset.galleryBound === "true") {
        return;
      }
      image.dataset.galleryBound = "true";
      const reschedule = () => schedule();
      image.addEventListener("load", reschedule);
      image.addEventListener("error", reschedule);
    });
  }

  function schedule() {
    if (!state.grid || state.frame) {
      return;
    }
    state.frame = window.requestAnimationFrame(() => {
      state.frame = 0;
      layoutGrid();
    });
  }

  function layoutGrid() {
    if (!state.grid || !state.grid.isConnected) {
      clear();
      return;
    }
    applyGridDistribution(state.grid);
    state.grid.dataset.masonryReady = "true";
    const metrics = readGridMetrics(state.grid);
    if (!metrics) {
      return;
    }
    const cards = Array.from(state.grid.querySelectorAll("[data-gallery-card]"));
    cards.forEach((card) => applyCardGeometry(card, metrics));
    cards.forEach((card) => applyRowSpan(card, metrics));
  }

  function readGridMetrics(grid) {
    const styles = window.getComputedStyle(grid);
    const columns = styles.gridTemplateColumns
      .split(" ")
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!columns.length) {
      return null;
    }
    const rowUnit = Number.parseFloat(styles.gridAutoRows);
    const rowGap = Number.parseFloat(styles.rowGap);
    const columnGap = Number.parseFloat(styles.columnGap);
    return {
      columnCount: columns.length,
      trackWidth: columns[0],
      rowUnit: Number.isFinite(rowUnit) && rowUnit > 0 ? rowUnit : 8,
      rowGap: Number.isFinite(rowGap) && rowGap >= 0 ? rowGap : 0,
      columnGap: Number.isFinite(columnGap) && columnGap >= 0 ? columnGap : 0,
    };
  }

  function applyCardGeometry(card, metrics) {
    const stage = card.querySelector("[data-gallery-stage]");
    const image = card.querySelector("[data-gallery-image]");
    if (!stage || !image) {
      return;
    }

    const ratio = readAspectRatio(image);
    const landscape = ratio > 1.01;
    const preferredWidth = landscape ? ratio * LANDSCAPE_TARGET_HEIGHT : PORTRAIT_TARGET_WIDTH;
    const maxSpan = landscape
      ? Math.min(metrics.columnCount, MAX_LANDSCAPE_SPAN)
      : Math.min(metrics.columnCount, 2);
    const span = Math.max(1, Math.min(maxSpan, Math.ceil((preferredWidth + metrics.columnGap) / (metrics.trackWidth + metrics.columnGap))));

    card.dataset.orientation = landscape ? "landscape" : "portrait";
    card.style.setProperty("--card-column-span", String(span));
    stage.style.setProperty("--thumb-aspect-ratio", `${ratio}`);
  }

  function readAspectRatio(image) {
    const width = Number(image.naturalWidth);
    const height = Number(image.naturalHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return FALLBACK_RATIO;
    }
    return width / height;
  }

  function applyRowSpan(card, metrics) {
    const height = card.getBoundingClientRect().height;
    const span = Math.max(1, Math.ceil((height + metrics.rowGap) / (metrics.rowUnit + metrics.rowGap)));
    card.style.setProperty("--card-row-span", String(span));
  }

  function applyGridDistribution(grid) {
    const availableWidth = grid.clientWidth;
    if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
      return;
    }
    const baseTrackWidth = preferredTrackWidth(availableWidth);
    let columnCount = Math.max(1, Math.floor((availableWidth + MIN_DISTRIBUTED_GAP) / (baseTrackWidth + MIN_DISTRIBUTED_GAP)));
    while (columnCount > 1) {
      const gap = (availableWidth - (columnCount * baseTrackWidth)) / (columnCount - 1);
      if (gap >= MIN_DISTRIBUTED_GAP) {
        break;
      }
      columnCount -= 1;
    }
    const distributedGap = columnCount > 1
      ? Math.max(MIN_DISTRIBUTED_GAP, (availableWidth - (columnCount * baseTrackWidth)) / (columnCount - 1))
      : 0;
    const trackWidth = columnCount > 1 ? baseTrackWidth : availableWidth;

    grid.style.setProperty("--browser-card-columns", String(columnCount));
    grid.style.setProperty("--browser-card-track-width", `${trackWidth}px`);
    grid.style.setProperty("--browser-card-gap", `${distributedGap}px`);
  }

  function preferredTrackWidth(availableWidth) {
    if (availableWidth <= 720) {
      return MOBILE_TRACK_WIDTH;
    }
    if (availableWidth <= 1200) {
      return TABLET_TRACK_WIDTH;
    }
    return DESKTOP_TRACK_WIDTH;
  }

  return {
    bind,
    clear,
  };
}
