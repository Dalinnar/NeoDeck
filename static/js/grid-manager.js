// Base Button class
class BaseButton {
  constructor(buttonData, index) {
    this.data = buttonData;
    this.index = index;
    this.element = null;
  }

  createElement() {
    const button_div = document.createElement("div");
    button_div.classList.add("button_div");
    button_div.id = "button_" + this.index;
    
    this.element = button_div;
    this.applyBasicStyling();
    this.addContent();
    this.setupInteractions();
    
    return button_div;
  }

  applyBasicStyling() {
    Object.assign(this.element.style, {
      backgroundColor: this.data.background_color,
      color: this.data.text_color,
      gridArea: `${this.data.row} / ${this.data.column} / ${this.data.endrow ?? this.data.row} / ${this.data.endcolumn ?? this.data.column}`
    });
  }

  addContent() {
    this.addImage();
    this.addText();
  }

  addImage() {
    if (this.data.image) {
      const img = document.createElement("img");
      Object.assign(img, {
        src: this.data.image,
        draggable: false,
        alt: "Button Image"
      });
      Object.assign(img.style, {
        width: `${this.data.image_size}%`,
        height: `${this.data.image_size}%`
      });
      this.element.appendChild(img);
    }
  }

  addText() {
    if (this.data.btn_text) {
      const btn_text = document.createElement("h3");
      btn_text.innerText = this.data.btn_text;
      btn_text.style.zIndex = 2;
      this.element.appendChild(btn_text);
    }
  }

  setupInteractions() {
    this.setupCommands();
    this.setupClickEvents();
  }

  setupCommands() {
    if (!this.data.command) return;

    // Handle JavaScript evaluation commands
    if (this.data.command.startsWith("$")) {
      this.element.addEventListener("click", () => {
        eval(this.data.command.slice(1));
      });
    }

    // Handle server commands
    if (this.data.command.startsWith("/")) {
      this.element.addEventListener("click", () => {
        send_data(this.data.command);
      });
    }
  }

  setupClickEvents() {
    if (!(this.data.single_click || this.data.double_click || this.data.hold)) return;

    // Event state tracking variables
    const state = {
      clickTimeout: null,
      isHolding: false,
      doubleClickPending: false,
      lastClickTime: 0,
      doubleClickThreshold: 300,
      holdThreshold: 1000
    };

    // Handle single clicks
    this.element.addEventListener("click", (event) => {
      const currentTime = new Date().getTime();

      if (currentTime - state.lastClickTime < state.doubleClickThreshold) {
        state.doubleClickPending = true;
        clearTimeout(state.clickTimeout);
        return;
      }

      state.lastClickTime = currentTime;

      if (!state.isHolding && this.data.single_click) {
        state.clickTimeout = setTimeout(() => {
          if (!state.doubleClickPending && !state.isHolding) {
            send_data(this.data.single_click);
          }
          state.doubleClickPending = false;
        }, state.doubleClickThreshold);
      }
    });

    // Handle double clicks
    if (this.data.double_click) {
      this.element.addEventListener("dblclick", () => {
        clearTimeout(state.clickTimeout);
        state.doubleClickPending = false;
        send_data(this.data.double_click);
        state.lastClickTime = 0;
      });
    }

    // Handle press and hold
    if (this.data.hold) {
      let holdTimeout;

      this.element.addEventListener("mousedown", () => {
        clearTimeout(state.clickTimeout);

        holdTimeout = setTimeout(() => {
          state.isHolding = true;
          state.doubleClickPending = false;
          send_data(this.data.hold);
        }, state.holdThreshold);
      });

      const handleRelease = () => {
        clearTimeout(holdTimeout);
        if (state.isHolding) {
          setTimeout(() => {
            state.isHolding = false;
            state.lastClickTime = 0;
          }, 300);
        }
      };

      this.element.addEventListener("mouseup", handleRelease);
      this.element.addEventListener("mouseleave", handleRelease);
    }
  }
}

// Monitor Button class
class MonitorButton extends BaseButton {
  setupCommands() {
    super.setupCommands();
    
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
  setupCommands() {
    super.setupCommands();
    
    if (this.data.command && this.data.command.startsWith("!")) {
      this.createSlider();
    }
  }

  createSlider() {
    const range = document.createElement("input");
    
    // Get initial value from server
    send_data(this.data.command + " get").then((data) => {
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
      send_data(this.data.command + " " + range.value);
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
  static createButton(buttonData, index) {
    if (buttonData.custom_generator) {
      return new CustomButton(buttonData, index);
    }
    
    if (buttonData.command === "#monitor") {
      return new MonitorButton(buttonData, index);
    }
    
    if (buttonData.command && buttonData.command.startsWith("!")) {
      return new SliderButton(buttonData, index);
    }
    
    return new BaseButton(buttonData, index);
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

// Initialize grid manager instance
const gridManager = new GridManager();

// Main script - maintains the same interface
