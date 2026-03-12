// Optimized Selection Class with Drag and Resize Support

window.isEditMode = false;

class Selection {
    constructor({
        selectionBorder = "1px solid rgba(255,255,255,.7)",
        selectionBackground = "rgba(255,255,255,.1)"
    } = {}) {
        this.$element = document.createElement("div");
        this._initDivStyles(selectionBackground, selectionBorder);
        document.body.appendChild(this.$element);

        this.isActive = false;
        this.topLeftPoint = { x: 0, y: 0 };
        this.bottomRightPoint = { x: 0, y: 0 };

        document.addEventListener("mousedown", this._handleMouseDown.bind(this));
        document.addEventListener("mousemove", this._handleMouseMove.bind(this));
        document.addEventListener("mouseup", this._handleMouseUp.bind(this));

        document.body.addEventListener("dragstart", this._handleDragStart.bind(this), true);
        document.body.addEventListener("dragover", this._handleDragOver.bind(this), true);
        document.body.addEventListener("drop", this._handleDrop.bind(this), true);
    }

    _initDivStyles(background, border) {
        const style = this.$element.style;
        this.$element.hidden = true;
        style.pointerEvents = "none";
        style.position = "absolute";
        style.background = background;
        style.border = border;
        style.zIndex = 9999;
    }

    _handleMouseDown(event) {
        if (!window.menu_open || window.dialogopen) return;
        
        if (document.querySelector("#pages-container.hidden") || event.target.closest("button, input, textarea, .button_div, .menuContainer, #pages-container","dialog" )) return;

        const gridItem = event.target.closest(".grid-item"),
              inButtons = document.querySelector("#buttons-container")?.contains(event.target);

        if (!gridItem && !inButtons) document.querySelectorAll(".grid-item.selected").forEach(i => i.classList.remove("selected"));
        if (!inButtons) {
            this.isActive = true;
            this.topLeftPoint = { x: event.clientX, y: event.clientY };
            this.bottomRightPoint = { x: event.clientX, y: event.clientY };
            this._draw();
        }
    }

    _handleMouseMove(event) {
        if (!this.isActive) return;
        this.bottomRightPoint = { x: event.clientX, y: event.clientY };
        this._draw();
        this.$element.hidden = false;
        document.body.style.userSelect = "none";
        this._applySelection();
    }

    _handleMouseUp() {
        this.isActive = false;
        this.$element.hidden = true;
        document.body.style.userSelect = "initial";
    }

    _draw() {
        const x1 = Math.min(this.topLeftPoint.x, this.bottomRightPoint.x);
        const y1 = Math.min(this.topLeftPoint.y, this.bottomRightPoint.y);
        const x2 = Math.max(this.topLeftPoint.x, this.bottomRightPoint.x);
        const y2 = Math.max(this.topLeftPoint.y, this.bottomRightPoint.y);

        const style = this.$element.style;
        style.left = `${x1}px`;
        style.top = `${y1}px`;
        style.width = `${x2 - x1}px`;
        style.height = `${y2 - y1}px`;
    }

    _applySelection() {
        const [x1, x2] = [this.topLeftPoint.x, this.bottomRightPoint.x].sort((a,b) => a - b);
        const [y1, y2] = [this.topLeftPoint.y, this.bottomRightPoint.y].sort((a,b) => a - b);
        document.querySelectorAll(".grid-item").forEach(item => {
            const rect = item.getBoundingClientRect();
            item.classList.toggle("selected", !(rect.right < x1 || rect.left > x2 || rect.bottom < y1 || rect.top > y2));
        });
    }

    _handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
    }

    _handleDragOver(e) {
        e.preventDefault();
    }

    _handleDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const el = document.getElementById(id);
        const sel = document.querySelectorAll(".grid-item.selected");
        const dropTarget = [...document.querySelectorAll(".grid-item")].find(i => {
            const r = i.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        });
        if (!dropTarget) return;

        const [row, col] = dropTarget.style.gridArea.split(" / ").map(Number);
        const [oRow, oCol] = el.style.gridArea.split(" / ").map(Number);

        const btn = window.folder_data.buttons.find(b => b.row === oRow && b.column === oCol);
        if (!btn) return;

        if (sel.length && dropTarget.classList.contains("selected")) return resize_element(el);
        if (!canFitInGrid(row, col, row, col, btn)) return alert("Cannot place button: position is occupied");

        Object.assign(el.style, { gridArea: `${row} / ${col} / ${row + 1} / ${col + 1}` });
        Object.assign(btn, { row, column: col, endrow: row + 1, endcolumn: col + 1 });

        uploadFolderData(folder_name, folder_data).then(res => updateGrid(res.folder)).catch(console.error);
    }
}

const selector = new Selection();

function createOccupiedGrid(exclude = null) {
    const { rows, columns, buttons } = window.folder_data;
    const grid = Array.from({ length: rows }, () => Array(columns).fill(false));

    buttons.forEach(({ row, column, endrow, endcolumn }) => {
        if (exclude && exclude.row === row && exclude.column === column && exclude.endrow === endrow && exclude.endcolumn === endcolumn) return;
        for (let r = row; r < endrow; r++) for (let c = column; c < endcolumn; c++)
            if (r > 0 && r <= rows && c > 0 && c <= columns) grid[r - 1][c - 1] = true;
    });
    return grid;
}

function canFitInGrid(minR, minC, maxR, maxC, exclude = null) {
    const { rows, columns } = window.folder_data;
    if (minR < 1 || maxR > rows || minC < 1 || maxC > columns) return false;
    const grid = createOccupiedGrid(exclude);
    for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) if (grid[r - 1][c - 1]) return false;
    return true;
}

function resize_element(el) {
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    document.querySelectorAll(".grid-item.selected").forEach(el => {
        const [r, c] = el.style.gridArea.split(" / ").map(Number);
        minR = Math.min(minR, r), maxR = Math.max(maxR, r);
        minC = Math.min(minC, c), maxC = Math.max(maxC, c);
    });

    const [oR, oC, oER, oEC] = el.style.gridArea.split(" / ").map(Number);
    const btn = window.folder_data.buttons.find(b => b.row === oR && b.column === oC && b.endrow === oER && b.endcolumn === oEC);
    if (!btn) return;

    if (!canFitInGrid(minR, minC, maxR, maxC, btn)) return alert("Cannot resize: would overlap with existing buttons");

    Object.assign(el.style, { gridArea: `${minR} / ${minC} / ${maxR + 1} / ${maxC + 1}` });
    Object.assign(btn, { row: minR, column: minC, endrow: maxR + 1, endcolumn: maxC + 1 });

    uploadFolderData(folder_name, folder_data).then(res => updateGrid(res.folder)).catch(console.error);
}