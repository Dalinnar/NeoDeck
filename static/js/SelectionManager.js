class Selection {
    constructor({
        selectionBorder = "1px solid rgba(255,255,255,.7)",
        selectionBackground = "rgba(255,255,255,.1)"
    } = {}) {
        this.$element = document.createElement("div");
        this._initDivStyles(selectionBackground, selectionBorder);
        document.body.appendChild(this.$element);

        this.topLeftPoint = { x: 0, y: 0 };
        this.bottomRightPoint = { x: 0, y: 0 };
        this.isActive = false;

        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);

        this._initEventListeners();
    }

    _initEventListeners() {
        document.addEventListener("mousedown", this._handleMouseDown);
        document.addEventListener("mousemove", this._handleMouseMove);
        document.addEventListener("mouseup", this._handleMouseUp);

        // Usar delegación de eventos para escuchar los eventos drag en cualquier button_div
        document.body.addEventListener("dragstart", this._handleDragStart, true);
        document.body.addEventListener("dragover", this._handleDragOver, true);
        document.body.addEventListener("drop", this._handleDrop, true);


    }

    _handleMouseDown(event) {
        //!if we are not on edition mode , cannot select
        if (document.querySelector("#pages-container").classList.contains("hidden")) return;

        //! exception zones where the selection is not allowed        
        if (event.target.closest("button, input, textarea, .button_div, .menuContainer, #pages-container")) return;

        const buttonsContainer = document.querySelector("#buttons-container");
        const isInsideGridItem = event.target.closest(".grid-item");
        const isInsideButtonsContainer = buttonsContainer && buttonsContainer.contains(event.target);

        if (!isInsideGridItem && !isInsideButtonsContainer) {
            document.querySelectorAll('.grid-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }

        if (!isInsideButtonsContainer) {
            this.isActive = true;
            this.topLeftPoint = { x: event.clientX, y: event.clientY };
            this._draw();
        }
    }

    _handleMouseMove(event) {
        if (!this.isActive) return;

        this.$element.hidden = false;
        document.body.style.userSelect = "none";

        this.bottomRightPoint = { x: event.clientX, y: event.clientY };
        this._draw();
        this._applySelection();
    }

    _handleMouseUp(event) {
        this.isActive = false;
        this.$element.hidden = true;
        document.body.style.userSelect = "initial";
    }

    _initDivStyles(selectionBackground, selectionBorder) {
        this.$element.hidden = true;
        this.$element.style.pointerEvents = "none";
        this.$element.style.position = "absolute";
        this.$element.style.background = selectionBackground;
        this.$element.style.border = selectionBorder;
        this.$element.style.zIndex = "9999";
    }

    _draw() {
        const x1 = Math.min(this.topLeftPoint.x, this.bottomRightPoint.x);
        const x2 = Math.max(this.topLeftPoint.x, this.bottomRightPoint.x);
        const y1 = Math.min(this.topLeftPoint.y, this.bottomRightPoint.y);
        const y2 = Math.max(this.topLeftPoint.y, this.bottomRightPoint.y);

        this.$element.style.left = `${x1}px`;
        this.$element.style.top = `${y1}px`;
        this.$element.style.width = `${x2 - x1}px`;
        this.$element.style.height = `${y2 - y1}px`;
    }

    _applySelection() {
        const gridItems = document.querySelectorAll('.grid-item');

        const x1 = Math.min(this.topLeftPoint.x, this.bottomRightPoint.x);
        const x2 = Math.max(this.topLeftPoint.x, this.bottomRightPoint.x);
        const y1 = Math.min(this.topLeftPoint.y, this.bottomRightPoint.y);
        const y2 = Math.max(this.topLeftPoint.y, this.bottomRightPoint.y);

        gridItems.forEach(item => {
            const rect = item.getBoundingClientRect();

            const intersects = !(rect.right < x1 || rect.left > x2 || rect.bottom < y1 || rect.top > y2);

            if (intersects) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    _handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.id);
    }

    _handleDragOver(event) {
        event.preventDefault();
    }

    _handleDrop(event) {
        console.log('Drop event triggered');
        event.preventDefault();

        const draggedElementId = event.dataTransfer.getData('text/plain');
        const draggedElement = document.getElementById(draggedElementId);

        if (event.target.classList.contains('selected')) {

            //funtion to pass the dragged element to the function
            resize_element(draggedElement);


        }
    }
}

const selector = new Selection();


function resize_element(element) {
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;

    // Get coordinates of selected elements
    document.querySelectorAll(".grid-item.selected").forEach(selectedElement => {
        const [row, column] = selectedElement.style.gridArea.split(" / ").map(Number);
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, column);
        maxCol = Math.max(maxCol, column);
    });

    // Check if the selected area overlaps with other buttons
    const buttons = document.querySelectorAll(".button_div");
    for (let button of buttons) {
        [ogrow, ogcol] = element.style.gridArea.split(" / ").map(Number);
        if (button === element) continue;

        [buttonRow, buttonCol] = button.style.gridArea.split(" / ").map(Number);;
        
        
        
        // Check if the button overlaps with the new button area
        if (buttonRow >= minRow && buttonRow <= maxRow && buttonCol >= minCol && buttonCol <= maxCol) {
            alert("Cannot overlap with existing buttons");
            return;
        }
    }

    // Set the new grid area for the element
    element.style.gridArea = `${minRow} / ${minCol} / ${maxRow + 1} / ${maxCol + 1}`;


    let button_to_update = window.folder_data.buttons.find(button => button.row === ogrow && button.column === ogcol);

    if (!button_to_update) {
        alert("Button not found");
        return;
    }

    // Update button data
    button_to_update.row = minRow;
    button_to_update.column = minCol;
    button_to_update.endrow = maxRow + 1;
    button_to_update.endcolumn = maxCol + 1;

    console.log(window.folder_data.buttons);
    uploadFolderData(folder_name, folder_data).then(result => {
        updateGrid(result.folder);
    }).catch(error => {
        console.error(error);
    });

    // Call a function to save the new grid layout
}