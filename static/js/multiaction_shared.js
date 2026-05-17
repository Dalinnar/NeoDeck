// multiaction_shared.js
// Shared drag-and-drop logic and dropzone population used by both
// setup_multiaction (create) and setup_multiaction_edit (edit).

function createDragHandlers(dropzone) {
    let draggedContainer = null;

    function handleButtonDragStart(e) {
        draggedContainer = e.currentTarget;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-reorder", "true");
        draggedContainer.style.opacity = "0.5";
    }

    function handleButtonDragEnd(e) {
        draggedContainer.style.opacity = "1";
        draggedContainer = null;
    }

    function handleButtonDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const isReorder = e.dataTransfer.types.includes("application/x-reorder");
        if (!isReorder || !draggedContainer) return;
        const afterElement = getDragAfterElement(dropzone, e.clientY);
        if (afterElement == null) dropzone.appendChild(draggedContainer);
        else dropzone.insertBefore(draggedContainer, afterElement);
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".multiaction_button_container:not(.dragging)")];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    return { handleButtonDragStart, handleButtonDragEnd, handleButtonDragOver };
}

// Builds a single draggable button container for the dropzone.
// Used when a button is dropped in (create) or pre-populated (edit).
function buildMultiactionButtonContainer(id, buttonData, localButtonData, dragHandlers) {
    const { handleButtonDragStart, handleButtonDragEnd, handleButtonDragOver } = dragHandlers;

    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        if (attributes.text) el.textContent = attributes.text;
        if (attributes.src) el.src = attributes.src;
        return el;
    };

    const buttonContainer = createElement("div", ["multiaction_button_container"]);
    buttonContainer.draggable = true;
    buttonContainer.addEventListener("dragstart", handleButtonDragStart);
    buttonContainer.addEventListener("dragend", handleButtonDragEnd);
    buttonContainer.addEventListener("dragover", handleButtonDragOver);
    buttonContainer.dataset.buttonId = id;

    const header = createElement("div", ["button_header"]);
    const leftContainer = createElement("div", ["buttondata_container"]);

    const img = createElement("img", [], {
        src: buttonData.style?.image ? `/static/img/${buttonData.style.image}` : "/static/img/key.png"
    });
    img.src = buttonData.style?.image ? `/static/img/${buttonData.style.image}` : "/static/img/key.png";

    const title = createElement("span", ["button_title"], { text: buttonData.ButtonTitle || "Button" });
    leftContainer.appendChild(img);
    leftContainer.appendChild(title);

    const inputsContainer = createElement("div", ["inputs_container"]);

    // Handle slider commands
    if (buttonData.command?.startsWith("!")) {
        buttonData.inputs ??= [];
        let slide_input = buttonData.inputs.find(i => i.name === "_slider_out");
        if (!slide_input) {
            slide_input = {
                TYPE: "input number",
                name: "_slider_out",
                attributes: { min: buttonData.min ?? 0, max: buttonData.max ?? 0 }
            };
            buttonData.inputs.push(slide_input);
        }
        const placeholder = `{${slide_input.name}}`;
        if (!buttonData.command.includes(placeholder)) {
            buttonData.command = buttonData.command.trim() + ` ${placeholder}`;
        }
    }

    // Handle action-based or input-based buttons
    if (buttonData.commands && typeof buttonData.commands === "object" && !buttonData.command && buttonData.actions) {
        buttonData.actions = ["trigger"];
        inputsContainer.appendChild(setup_actions(buttonData));

        const chevron = createElement("span", ["button_chevron"], { text: "▼" });
        chevron.addEventListener("click", () => {
            const isHidden = inputsContainer.classList.contains("hidden");
            inputsContainer.classList.toggle("hidden");
            chevron.textContent = isHidden ? "▼" : "▲";
        });
        leftContainer.appendChild(chevron);
    } else if (buttonData.inputs?.length) {
        buttonData.inputs.forEach(input => inputsContainer.appendChild(createInputField(input)));

        const chevron = createElement("span", ["button_chevron"], { text: "▼" });
        chevron.addEventListener("click", () => {
            const isHidden = inputsContainer.classList.contains("hidden");
            inputsContainer.classList.toggle("hidden");
            chevron.textContent = isHidden ? "▼" : "▲";
        });
        leftContainer.appendChild(chevron);
    }

    const removeBtn = createElement("span", ["buttondata_cancel"], { text: "✖" });
    removeBtn.addEventListener("click", () => buttonContainer.remove());

    header.appendChild(leftContainer);
    header.appendChild(removeBtn);
    buttonContainer.appendChild(header);
    buttonContainer.appendChild(inputsContainer);

    return buttonContainer;
}

function collectMultiactionButtons(localButtonData) {
    const actions = [];
    document.querySelectorAll(".multiaction_button_container").forEach(container => {
        const buttonData = localButtonData?.[container.dataset.buttonId];

        if (!buttonData && container.dataset.command) {
            actions.push({ command: container.dataset.command });
            return;
        }
        if (!buttonData) return;

        const inputs = Object.fromEntries(
            [...container.querySelectorAll("[name]:not([disabled])")].map(i => [i.name, i])
        );
        const replacer = createReplacer(inputs, true);

        if (buttonData.command) {
            actions.push({ command: replacer(buttonData.command) });
        } else if (buttonData.actions && buttonData.commands) {
            actions.push({ command: replacer(inputs.trigger?.value || "") });
        }
    });
    return actions;
}