// Base Button class
class BaseButton {
  constructor(buttonData, index) {
    this.data = buttonData;
    this.index = index;
    this.element = null;
  }

  createElement() {
    const el = document.createElement("div");
    el.classList.add("button_div");
    el.id = "button_" + this.index;

    this.element = el;

    this.applyBasicStyling();
    this.addContent();
    this.setupInteractions();

    return el;
  }

  /* ------------------------- */
  /*         CONTENT           */
  /* ------------------------- */

  applyBasicStyling() {
    Object.assign(this.element.style, {
      backgroundColor: this.data.background_color,
      color: this.data.text_color,
      gridArea: `${this.data.row} / ${this.data.column} / ${this.data.endrow ?? this.data.row} / ${this.data.endcolumn ?? this.data.column}`,
    });
  }

  addContent() {
    if (this.data.image) this.addImage();
    if (this.data.btn_text) this.addText();
    if (this.data.toggleable) this.addToggleable();
  }

  addImage() {
    const img = document.createElement("img");
    Object.assign(img, {
      src: this.data.image,
      draggable: false,
      alt: "Button Image",
    });
    img.style.width = img.style.height = `${this.data.image_size}%`;
    this.element.appendChild(img);
  }

  addText() {
    const text = document.createElement("h3");
    text.innerText = this.data.btn_text;
    text.style.zIndex = 2;
    this.element.appendChild(text);
  }

  addToggleable() {
    // Fetch initial state only 1 vez
    request_data(this.data.command, "get").then((data) => {
      if (data) this.element.classList.add("toggled");
    });

    // Toggle visual only
    this.element.addEventListener("click", () => {
      this.element.classList.toggle("toggled");
    });
  }

  /* ------------------------- */
  /*       INTERACTIONS        */
  /* ------------------------- */

  setupInteractions() {
    this.setupCommandExecution();
    this.setupClickEvents();
  }

  setupCommandExecution() {
    const cmd = this.data.command;
    if (!cmd) return;

    const clickActions = [];

    if (cmd.startsWith("$")) {
      clickActions.push(() => eval(cmd.slice(1)));
    }

    if (cmd.startsWith("/")) {
      clickActions.push(() => request_data(cmd));
    }

    if (clickActions.length > 0) {
      this.element.addEventListener("click", () => {
        if (!window.menu_open) {
          clickActions.forEach((fn) => fn());
        }
      });
    }
  }

  /* ------------------------- */
  /* CLICK / DBLCLICK / HOLD   */
  /* ------------------------- */

  setupClickEvents() {
    const dd = this.data;
    if (!(dd.single_click || dd.double_click || dd.hold)) return;

    const state = {
      isHolding: false,
      lastClickTime: 0,
      clickTimeout: null,
      holdTimeout: null,
      doubleClickThreshold: 300,
      holdThreshold: 600,
    };

    const start = (e) => {
      if (window.menu_open) return;
      e.preventDefault();

      clearTimeout(state.holdTimeout);
      state.holdTimeout = setTimeout(() => {
        state.isHolding = true;
        if (dd.hold) request_data(dd.hold);
      }, state.holdThreshold);
    };

    const end = (e) => {
      if (window.menu_open) return;
      e.preventDefault();
      clearTimeout(state.holdTimeout);

      if (state.isHolding) {
        state.isHolding = false;
        state.lastClickTime = 0;
        return;
      }

      const now = Date.now();
      const diff = now - state.lastClickTime;

      // DOUBLE CLICK
      if (diff < state.doubleClickThreshold) {
        clearTimeout(state.clickTimeout);
        if (dd.double_click) request_data(dd.double_click);
        state.lastClickTime = 0;
        return;
      }

      // SINGLE CLICK (si no hay doble click después)
      state.lastClickTime = now;
      if (dd.single_click) {
        state.clickTimeout = setTimeout(() => {
          request_data(dd.single_click);
        }, state.doubleClickThreshold);
      }
    };

    this.element.addEventListener("mousedown", start);
    this.element.addEventListener("mouseup", end);

    this.element.addEventListener("touchstart", start);
    this.element.addEventListener("touchend", end);
  }
}

// Monitor Button class
class MonitorButton extends BaseButton {
  setupInteractions() {
    // run base interactions (commands, click handlers, etc)
    super.setupInteractions();

    if (this.data.command === "#monitor") {
      Initialize_monitors(this.data.track ?? undefined);

      const monitor = document.createElement("h2");
      monitor.style.zIndex = 2;
      monitor.setAttribute("data_from", this.data.collect_data_from);

      this.element.appendChild(monitor);
    }
  }
}

// Slider Button class
class SliderButton extends BaseButton {
  setupInteractions() {
    // Ejecuta toda la lógica original
    super.setupInteractions();

    // Si es un slider, lo crea
    if (this.data.command && this.data.command.startsWith("!")) {
      this.createSlider();
    }
  }

  createSlider() {
    const range = document.createElement("input");

    request_data(this.data.command, "get").then((data) => {
      if (data) {
        range.value = data;
      }
    });

    Object.assign(range, {
      type: "range",
      min: this.data.min,
      max: this.data.max
    });

    this.applySliderOrientation(range);
    this.setupSliderEvents(range);

    this.element.appendChild(range);
  }

  applySliderOrientation(range) {
    const rowSpan = (this.data.endrow || this.data.row) - this.data.row;
    const colSpan = (this.data.endcolumn || this.data.column) - this.data.column;
    const isVertical = rowSpan > colSpan;

    if (isVertical) {
      Object.assign(range.style, {
        writingMode: "sideways-lr",
        minWidth: "30px",
        maxWidth: "20%",
        height: "100%"
      });
      range.style.setProperty('--thumb-width', '120%');
      range.style.setProperty('--thumb-height', '10%');
    } else {
      Object.assign(range.style, {
        writingMode: "horizontal-tb",
        width: "100%",
        minHeight: "30px",
        maxHeight: "20%"
      });
      range.style.setProperty('--thumb-width', '10%');
      range.style.setProperty('--thumb-height', '120%');
    }

    range.classList.add("slider");
    range.style.zIndex = 2;

    if (this.data.btn_text) {
      this.element.style.flexDirection = "column-reverse";
      range.style.marginBottom = "10px";
    }
  }

  setupSliderEvents(range) {
    range.addEventListener("change", () => {
      request_data(this.data.command + " " + range.value);
    });
  }
}

// Custom Generator Button class
class CustomButton extends BaseButton {
  createElement() {
    // Execute custom generator code
    eval(this.data.custom_generator);
    return null; // Custom generators handle their own DOM creation
  }
}

// Button Factory
class ButtonFactory {
  static registry = {};

  static register(type, classRef) {
    this.registry[type] = classRef;
  }

  static createButton(buttonData, index) {

    // 1) Si el plugin registró un botón personalizado:
    if (buttonData.type && this.registry[buttonData.type]) {
      return new this.registry[buttonData.type](buttonData, index);
    }

    // 2) Botones internos del sistema:
    if (buttonData.custom_generator) {
      return new CustomButton(buttonData, index);
    }

    if (buttonData.command === "__multiaction__") {
      return new MultiActionButton(buttonData, index);
    }

    if (buttonData.command === "#monitor") {
      return new MonitorButton(buttonData, index);
    }

    if (buttonData.command === "#scrollpad" || buttonData.type === "scrollpad") {
      return new ScrollPadButton(buttonData, index);
    }

    if (buttonData.command && buttonData.command.startsWith("!")) {
      return new SliderButton(buttonData, index);
    }

    // 3) Botón por defecto:
    return new BaseButton(buttonData, index);
  }
}
window.ButtonFactory = ButtonFactory; // importante para plugins

class ScrollPadButton extends BaseButton {
  setupInteractions() { } // Deshabilita BaseButton

  createElement() {
    const pad = document.createElement("div");
    pad.classList.add("scrollpad", "button_div");
    pad.id = "button_" + this.index;
    pad.tabIndex = 0;

    Object.assign(pad.style, {
      gridArea: `${this.data.row} / ${this.data.column} / ${this.data.endrow ?? this.data.row} / ${this.data.endcolumn ?? this.data.column}`,
      backgroundColor: this.data.background_color || "transparent",
      color: this.data.text_color || "inherit",
      overflow: "hidden",
      position: "relative",
      touchAction: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      userSelect: "none"
    });

    const label = document.createElement("div");
    label.innerText = this.data.btn_text || "SCROLL PAD";
    label.style.cssText = "pointer-events:none; z-index:2;";
    pad.appendChild(label);

    ScrollPadButton.ensureSocketIO();

    const state = {
      dragging: false,
      lastPos: null,
      mode: this.data.scrollpad_mode || "relative",
      sensitivity: Number(this.data.sensitivity || 1),
      id: this.data.id || "scrollpad_" + Math.random().toString(36).slice(2, 9),
      collect_from: this.data.collect_data_from ?? null,
      rect: null,
      wheelMode: false,
      lastDistance: null
    };

    const activeTouches = new Map(); // ⬅️ controles multi-touch

    const sendMove = payload =>
      ScrollPadButton.socketIOSend({
        type: "scrollpad_move",
        id: state.id,
        collect_from: state.collect_from,
        payload
      });

    const handleMove = (x, y) => {
      if (state.wheelMode) return; // ⬅️ NO mover mouse en wheel mode

      if (!state.lastPos) {
        state.lastPos = { x, y };
        return;
      }

      const { lastPos, rect, sensitivity, mode } = state;

      if (mode === "relative") {
        sendMove({
          mode,
          dx: Math.round((x - lastPos.x) * sensitivity),
          dy: Math.round((y - lastPos.y) * sensitivity),
          ts: Date.now()
        });
      } else {
        sendMove({
          mode,
          x: Math.min(1, Math.max(0, (x - rect.left) / rect.width)),
          y: Math.min(1, Math.max(0, (y - rect.top) / rect.height)),
          ts: Date.now()
        });
      }

      state.lastPos = { x, y };
    };

    const detectTwoFingerScroll = () => {
      if (activeTouches.size !== 2) {
        state.wheelMode = false;
        state.lastDistance = null;
        return;
      }

      const pts = [...activeTouches.values()];
      const dy = pts[0].y - pts[1].y;
      const absDy = Math.abs(dy);

      const distance = absDy;

      // primera medición
      if (state.lastDistance === null) {
        state.lastDistance = distance;
        state.wheelMode = true;
        return;
      }

      const diff = distance - state.lastDistance;
      state.lastDistance = distance;

      if (Math.abs(diff) > 2) {
        sendMove({
          mode: "wheel",
          dy: diff * 0.5,
          ts: Date.now()
        });
      }
    };

    const endInteraction = () => {
      if (!state.dragging) return;

      state.dragging = false;
      state.lastPos = null;

      sendMove({ mode: "stop", ts: Date.now() });

      setTimeout(() => (window.isUsingScrollPad = false), 250);
    };

    // -------------------------------
    // POINTER EVENTS
    // -------------------------------
    pad.addEventListener("pointerdown", ev => {
      if (window.menu_open) return;
      ev.preventDefault();

      window.isUsingScrollPad = true;

      activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      pad.setPointerCapture(ev.pointerId);

      if (activeTouches.size === 1) {
        state.dragging = true;
        state.rect = pad.getBoundingClientRect();
        state.lastPos = { x: ev.clientX, y: ev.clientY };
      }

      if (activeTouches.size === 2) {
        state.wheelMode = true;
      }
    });

    pad.addEventListener("pointermove", ev => {
      if (window.menu_open) return;
      ev.preventDefault();

      if (activeTouches.has(ev.pointerId)) {
        activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }

      detectTwoFingerScroll();

      if (!state.dragging || state.wheelMode) return;

      handleMove(ev.clientX, ev.clientY);
    });

    pad.addEventListener("pointerup", ev => {
      ev.preventDefault();
      activeTouches.delete(ev.pointerId);

      if (activeTouches.size < 2) {
        state.wheelMode = false;
        state.lastDistance = null;
      }

      if (activeTouches.size === 0) endInteraction();

      try { pad.releasePointerCapture(ev.pointerId); } catch { }
    });

    pad.addEventListener("pointercancel", ev => {
      activeTouches.delete(ev.pointerId);
      endInteraction();
    });

    pad.addEventListener("pointerleave", ev => {
      activeTouches.delete(ev.pointerId);
      endInteraction();
    });

    // PC Wheel
    pad.addEventListener("wheel", ev => {
      if (window.menu_open) return;
      ev.preventDefault();
      sendMove({
        mode: "wheel",
        dy: Math.round(ev.deltaY * state.sensitivity),
        ts: Date.now()
      });
    }, { passive: false });

    this.element = pad;
    return pad;
  }

  // SOCKET.IO
  static socket = null;

  static ensureSocketIO() {
    if (typeof io === "undefined")
      return console.error("[ScrollPad] Socket.IO not loaded");

    if (!ScrollPadButton.socket) {
      ScrollPadButton.socket = io();
      ScrollPadButton.socket.on("connect", () =>
        console.log("[ScrollPad] Connected")
      );
      ScrollPadButton.socket.on("disconnect", () =>
        console.log("[ScrollPad] Disconnected")
      );
    }
  }

  static socketIOSend(data) {
    if (!ScrollPadButton.socket?.connected)
      return console.warn("[ScrollPad] Not connected:", data);

    ScrollPadButton.socket.emit("scrollpad_move", data);
  }
}
class MultiActionButton extends BaseButton {
  constructor(buttonData, index) {
    super(buttonData, index);
  }

  setupCommandExecution() {
    // IMPORTANT: override BaseButton behavior
    const actions = this.data.actions;
    if (!Array.isArray(actions) || actions.length === 0) return;

    this.element.addEventListener("click", () => {
      if (window.menu_open) return;

      actions.forEach(action => {
        if (!action.command) return;

        const cmd = action.command;

        if (cmd.startsWith("$")) {
          try {
            eval(cmd.slice(1));
          } catch (e) {
            console.error("MultiAction eval error:", e);
          }
        }

        if (cmd.startsWith("/")) {
          request_data(cmd);
        }
      });
    });
  }
}

// Grid Manager class
class GridManager {
  constructor() {
    this.occupiedPositions = new Set();
  }

  updateGrid(pageData) {
    this.setupBackground(pageData);
    this.setupGridContainer(pageData);
    this.createButtons(pageData);
    this.fillEmptyGridCells(pageData.rows, pageData.columns);
    this.setupAdditionalFeatures();
  }

  setupBackground(pageData) {
    const main_container = document.querySelector(".main-container");
    if (pageData.background) {
      main_container.style.background = pageData.background;
    }
    if (pageData.background_img) {
      Object.assign(main_container.style, {
        backgroundImage: `url(${pageData.background_img})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center"
      });
    }
  }

  setupGridContainer(pageData) {
    const container = document.querySelector(".buttons-container");
    if (!container) return;

    container.innerHTML = "";
    this.occupiedPositions.clear();

    const rows = Number(pageData.rows);
    const cols = Number(pageData.columns);
    if (!rows || !cols) return;

    Object.assign(container.style, {
      display: "grid",
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      aspectRatio: `${cols} / ${rows}`
    });
  }

  createButtons(pageData) {
    const container = document.querySelector(".buttons-container");
    if (!container) return;

    pageData.buttons.forEach((buttonData, index) => {
      const button = ButtonFactory.createButton(buttonData, index);
      const element = button.createElement();

      if (element) {
        container.appendChild(element);
        this.occupiedPositions.add(`${buttonData.row}-${buttonData.column}`);
      }
    });
  }

  fillEmptyGridCells(rows, cols) {
    const container = document.querySelector(".buttons-container");
    if (!container) return;

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        // Skip if this position already has a button
        if (this.occupiedPositions.has(`${r}-${c}`)) {
          continue;
        }

        const element = document.createElement("div");
        element.style.gridArea = `${r} / ${c}`;
        element.classList.add("grid-item");
        container.appendChild(element);
      }
    }
  }

  setupAdditionalFeatures() {
    setupDragAndDrop();
    toggle_buttons_edition();
  }
}

const gridManager = new GridManager();