
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
    console.log("buttonData:")
    console.log(pageData.buttons)

    if (pageData.buttons.length === 0) {
      const hint = document.createElement("div");
      hint.className = "empty-grid-hint";
      hint.innerHTML = getTranslation("EMPTY_GRID_HINT")
      Object.assign(hint.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "rgba(255,255,255,0.5)",
        fontSize: "1.5rem",
        textAlign: "center",
        pointerEvents: "none",
        background: "none",
        zIndex: "1"
      });
      container.appendChild(hint);
    }

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
    super.setupInteractions();

    if (this.data.command && this.data.command.startsWith("!")) {
      this.createSlider();
    }
  }

  createSlider() {
    const range = document.createElement("input");

    request_data(this.data.command, "get").then((data) => {
      if (data) {
        range.value = data;
        if (this.knob) this.updateKnobRotation(this.knob, data);
      }
    });

    Object.assign(range, {
      type: "range",
      min: this.data.min,
      max: this.data.max
    });

    const rowSpan = (this.data.endrow || this.data.row) - this.data.row;
    const colSpan = (this.data.endcolumn || this.data.column) - this.data.column;
    const isSquare = rowSpan === colSpan;

    if (isSquare) {
      this.createKnob(range);
    } else {
      this.applySliderOrientation(range);
      this.setupSliderEvents(range);
      this.element.appendChild(range);
    }
  }

  createKnob(range) {
    range.style.display = "none";
    this.element.appendChild(range);

    const knob = document.createElement("div");
    this.knob = knob;
    knob.classList.add("knob");

    const knobInner = document.createElement("div");
    knobInner.classList.add("knob-inner");

    const knobDot = document.createElement("div");
    knobDot.classList.add("knob-dot");

    knobInner.appendChild(knobDot);
    knob.appendChild(knobInner);

    const knobLabel = document.createElement("div");
    knobLabel.classList.add("knob-label");
    knobLabel.textContent = range.value || range.min || 0;
    this.knobLabel = knobLabel;

    this.element.appendChild(knob);
    this.element.appendChild(knobLabel);

    this.setupKnobEvents(knob, range);
  }

  updateKnobRotation(knob, value) {
    const min = parseFloat(this.data.min) || 0;
    const max = parseFloat(this.data.max) || 100;
    const angle = ((value - min) / (max - min)) * 270 - 135;
    knob.querySelector(".knob-inner").style.transform = `rotate(${angle}deg)`;

    if (this.knobLabel) {
      this.knobLabel.textContent = Math.round(value);
    }
  }

  setupKnobEvents(knob, range) {
    let startY, startX, startValue, didDrag;
    const DRAG_THRESHOLD = 5;

    this.isMuted = false;
    this.premuteValue = null;

    const toggleMute = () => {
      if (!this.isMuted) {
        this.premuteValue = parseFloat(range.value);
        this.isMuted = true;
        range.value = 0;
        this.updateKnobRotation(knob, 0);
        request_data(this.data.command + " 0");
        knob.classList.add("knob--muted");
      } else {
        const restore = this.premuteValue ?? parseFloat(this.data.max) / 2;
        this.isMuted = false;
        range.value = restore;
        this.updateKnobRotation(knob, restore);
        request_data(this.data.command + " " + restore);
        knob.classList.remove("knob--muted");
      }
    };

    const onMove = (clientX, clientY) => {
      if (!didDrag) return;
      const deltaY = startY - clientY;
      const deltaX = clientX - startX;
      const delta = deltaY + deltaX;

      const min = parseFloat(this.data.min) || 0;
      const max = parseFloat(this.data.max) || 100;
      const sensitivity = (max - min) / 200;

      const newValue = Math.min(max, Math.max(min, startValue + delta * sensitivity));
      range.value = newValue;
      this.updateKnobRotation(knob, newValue);
    };

    // Mouse
    knob.addEventListener("mousedown", (e) => {
      didDrag = false;
      startY = e.clientY;
      startX = e.clientX;
      startValue = parseFloat(range.value) || 0;
      knob.classList.add("knob--dragging");

      const onMouseMove = (e) => {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) didDrag = true;
        onMove(e.clientX, e.clientY);
      };
      const onMouseUp = () => {
        if (!didDrag) toggleMute();
        else request_data(this.data.command + " " + range.value);
        knob.classList.remove("knob--dragging");
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    });

    // Touch
    knob.addEventListener("touchstart", (e) => {
      didDrag = false;
      const touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      startValue = parseFloat(range.value) || 0;

      const onTouchMove = (e) => {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) didDrag = true;
        onMove(t.clientX, t.clientY);
      };
      const onTouchEnd = () => {
        if (!didDrag) toggleMute();
        else request_data(this.data.command + " " + range.value);
        knob.removeEventListener("touchmove", onTouchMove);
        knob.removeEventListener("touchend", onTouchEnd);
      };

      knob.addEventListener("touchmove", onTouchMove, { passive: true });
      knob.addEventListener("touchend", onTouchEnd);
      e.preventDefault();
    }, { passive: false });
  }

  applySliderOrientation(range) {
    const rowSpan = (this.data.endrow || this.data.row) - this.data.row;
    const colSpan = (this.data.endcolumn || this.data.column) - this.data.column;
    const isVertical = rowSpan > colSpan;

    if (isVertical) {
      range.style.width = "var(--lever-long)";
      range.style.height = "100%";
      range.classList.remove("horizontal");
      range.classList.add("vertical", "slider");
    } else {
      range.style.width = "100%";
      range.style.height = "var(--lever-long)";
      range.classList.remove("vertical");
      range.classList.add("horizontal", "slider");
    }

    range.style.zIndex = "2";

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



class ScrollPadButton extends BaseButton {
  setupInteractions() { } // Disables BaseButton

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
      // Two-finger scroll state
      wheelMode: false,
      // Tracks each finger's last Y independently to get stable per-finger delta
      fingerLastY: new Map(),
      // Hold-for-right-click state
      holdTimer: null,
      holdFired: false,
      hasMoved: false,
      // Double-tap-and-drag (click & drag / selection)
      lastTapTime: 0,       // timestamp of last clean tap release
      dragLockTimer: null,  // waits to confirm the finger stayed down
      dragLocked: false,    // true while mouse button is held for drag
    };

    // All active pointer positions (used only to detect finger count)
    const activeTouches = new Map();

    const sendMove = payload =>
      ScrollPadButton.socketIOSend({
        type: "scrollpad_move",
        id: state.id,
        collect_from: state.collect_from,
        payload
      });

    // ─────────────────────────────────────────────
    // HOLD TIMER  (right-click after 2 s, no movement)
    // ─────────────────────────────────────────────
    const startHoldTimer = () => {
      clearHoldTimer();
      state.holdFired = false;
      state.hasMoved = false;
      state.holdTimer = setTimeout(() => {
        if (!state.hasMoved && activeTouches.size === 1) {
          state.holdFired = true;
          sendMove({ mode: "hold", ts: Date.now() });
          // Visual feedback: brief flash
          pad.style.transition = "background-color 0.1s";
          pad.style.backgroundColor = "rgba(255,80,80,0.35)";
          setTimeout(() => {
            pad.style.backgroundColor = this.data.background_color || "transparent";
          }, 200);
        }
      }, 2000);
    };

    const clearHoldTimer = () => {
      if (state.holdTimer !== null) {
        clearTimeout(state.holdTimer);
        state.holdTimer = null;
      }
    };

    // ─────────────────────────────────────────────
    // DRAG-LOCK HELPERS  (double-tap + hold → click & drag)
    // ─────────────────────────────────────────────
    const DOUBLE_TAP_MS = 300; // max ms between tap and second touch
    const DRAG_LOCK_MS = 150; // finger must stay down this long after double-tap

    const enterDragLock = () => {
      state.dragLocked = true;
      state.dragLockTimer = null;
      sendMove({ mode: "drag_start", ts: Date.now() });
      // Visual feedback: blue tint while dragging
      pad.style.transition = "background-color 0.1s";
      pad.style.backgroundColor = "rgba(80,140,255,0.35)";
    };

    const exitDragLock = () => {
      if (!state.dragLocked) return;
      state.dragLocked = false;
      sendMove({ mode: "drag_end", ts: Date.now() });
      pad.style.backgroundColor = this.data.background_color || "transparent";
    };

    const clearDragLockTimer = () => {
      if (state.dragLockTimer !== null) {
        clearTimeout(state.dragLockTimer);
        state.dragLockTimer = null;
      }
    };

    // ─────────────────────────────────────────────
    // MOUSE MOVEMENT  (single finger / pointer)
    // ─────────────────────────────────────────────
    const handleMove = (x, y) => {
      if (state.wheelMode) return;

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

    // ─────────────────────────────────────────────
    // TWO-FINGER SCROLL
    //
    // FIX: instead of comparing finger positions to each other
    // (unstable — Map order can vary), we track each finger's own
    // previous Y and accumulate the average delta across both fingers.
    // This means the sign is always correct and there's no flip.
    // ─────────────────────────────────────────────
    const processTwoFingerScroll = (pointerId, currentY) => {
      if (activeTouches.size !== 2) return;

      const prevY = state.fingerLastY.get(pointerId);
      state.fingerLastY.set(pointerId, currentY);

      if (prevY === undefined) return; // first sample for this finger

      const dy = currentY - prevY; // positive = finger moved down = scroll up (natural)

      if (Math.abs(dy) > 1) {
        sendMove({
          mode: "wheel",
          // Negate so "fingers move down → content scrolls down" (matches natural scroll)
          dy: -(dy * 0.5 * state.sensitivity),
          ts: Date.now()
        });
      }
    };

    // ─────────────────────────────────────────────
    // END INTERACTION
    // ─────────────────────────────────────────────
    const endInteraction = () => {
      clearHoldTimer();
      clearDragLockTimer();

      if (state.dragLocked) {
        // Finger lifted while drag-locked → release mouse button
        exitDragLock();
        state.dragging = false;
        state.lastPos = null;
        state.wheelMode = false;
        state.fingerLastY.clear();
        setTimeout(() => (window.isUsingScrollPad = false), 250);
        return;
      }

      if (!state.dragging) return;

      state.dragging = false;
      state.lastPos = null;
      state.wheelMode = false;
      state.fingerLastY.clear();

      if (!state.holdFired) {
        sendMove({ mode: "stop", ts: Date.now() });
      }

      setTimeout(() => (window.isUsingScrollPad = false), 250);
    };

    // ─────────────────────────────────────────────
    // POINTER EVENTS
    // ─────────────────────────────────────────────
    pad.addEventListener("pointerdown", ev => {
      if (window.menu_open) return;
      ev.preventDefault();

      window.isUsingScrollPad = true;

      activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      state.fingerLastY.set(ev.pointerId, ev.clientY);

      pad.setPointerCapture(ev.pointerId);

      if (activeTouches.size === 1) {
        state.dragging = true;
        state.wheelMode = false;
        state.rect = pad.getBoundingClientRect();
        state.lastPos = { x: ev.clientX, y: ev.clientY };

        const now = Date.now();
        const timeSinceLastTap = now - state.lastTapTime;

        if (timeSinceLastTap < DOUBLE_TAP_MS && !state.dragLocked) {
          // Second tap arrived quickly — wait DRAG_LOCK_MS to see if finger stays down
          clearDragLockTimer();
          state.dragLockTimer = setTimeout(() => {
            // Finger is still down → enter drag lock (mouse button held)
            enterDragLock();
            // Don't start hold-for-right-click during a drag
            clearHoldTimer();
          }, DRAG_LOCK_MS);
          // Don't start hold timer yet — we're in double-tap detection window
        } else {
          // Normal first tap
          startHoldTimer();
        }
      }

      if (activeTouches.size === 2) {
        state.wheelMode = true;
        state.hasMoved = true;
        clearHoldTimer();
        clearDragLockTimer();
      }
    });

    pad.addEventListener("pointermove", ev => {
      if (window.menu_open) return;
      ev.preventDefault();

      if (!activeTouches.has(ev.pointerId)) return;

      activeTouches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (state.wheelMode) {
        // Two-finger scroll: process per-finger delta
        processTwoFingerScroll(ev.pointerId, ev.clientY);
        return;
      }

      // Single-finger move
      handleMove(ev.clientX, ev.clientY);

      // If moved significantly, cancel the hold timer
      if (!state.hasMoved && state.lastPos) {
        const dx = ev.clientX - state.lastPos.x;
        const dy = ev.clientY - state.lastPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          state.hasMoved = true;
          clearHoldTimer();
        }
      }
    });

    pad.addEventListener("pointerup", ev => {
      ev.preventDefault();
      activeTouches.delete(ev.pointerId);
      state.fingerLastY.delete(ev.pointerId);

      if (activeTouches.size < 2) {
        state.wheelMode = false;
      }

      if (activeTouches.size === 0) {
        // If the drag-lock timer is still pending, this was a quick lift —
        // treat as a normal tap (record time) and cancel the drag-lock attempt
        if (state.dragLockTimer !== null) {
          clearDragLockTimer();
          // Record this as a valid tap time so a future quick tap can trigger drag-lock
          if (!state.hasMoved) state.lastTapTime = Date.now();
        } else if (!state.dragLocked && !state.hasMoved && !state.holdFired) {
          // Clean tap — record time for double-tap detection
          state.lastTapTime = Date.now();
        }

        endInteraction();
      }

      try { pad.releasePointerCapture(ev.pointerId); } catch { }
    });

    pad.addEventListener("pointercancel", ev => {
      activeTouches.delete(ev.pointerId);
      state.fingerLastY.delete(ev.pointerId);
      endInteraction();
    });

    pad.addEventListener("pointerleave", ev => {
      activeTouches.delete(ev.pointerId);
      state.fingerLastY.delete(ev.pointerId);
      endInteraction();
    });

    // PC mouse wheel
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

  // ── SOCKET.IO ──────────────────────────────────
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

        if (cmd.startsWith("/") || cmd.startsWith("!")) {
          request_data(cmd);
        }
      });
    });
  }
}



const gridManager = new GridManager();

