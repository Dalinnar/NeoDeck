// button_editor.js

function setup_regular_edit(button_data, folder_name, folder_data, column, row, savedButton, buttonIndex) {
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    const text_generic = document.createElement("input");
    text_generic.name = "button_text";
    text_generic.setAttribute("type", "text");
    text_generic.setAttribute("placeholder", "Button Text");
    text_generic.value = savedButton.btn_text || "";
    text_generic.addEventListener("input", () => {
        const button_text = document.getElementById("button_text");
        button_text.textContent = text_generic.value;
    });
    dialog_content.appendChild(text_generic);

    if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
        const actionsElement = setup_actions(button_data);
        dialog_content.appendChild(actionsElement);

        setTimeout(() => {
            button_data.actions.forEach(action => {
                if (savedButton[action]) {
                    const select = document.querySelector(`select[name="${action}"]`);
                    if (select) {
                        select.value = savedButton[action];
                        select.dispatchEvent(new Event('change'));
                    }
                }
            });
        }, 100);
    } else {
        button_data.inputs?.forEach(input => {
            const inputField = createInputField(input);
            dialog_content.appendChild(inputField);
            setTimeout(() => {
                const inputElement = inputField.querySelector(`[name="${input.name}"]`);
                if (inputElement && savedButton[input.name]) inputElement.value = savedButton[input.name];
            }, 50);
        });
    }

    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    setTimeout(() => {
        const button_text = document.getElementById("button_text");
        button_text.textContent = savedButton.btn_text || "";

        if (savedButton.image && savedButton.image !== "/static/img/empty_img.png") {
            const img = document.querySelector(".button_image");
            img.src = savedButton.image;
        }

        button_template.style.backgroundColor = savedButton.background_color || "#1e1e1e";
        const text_div = document.querySelector(".button_text_div");
        text_div.style.color = savedButton.text_color || "#ffffff";
    }, 50);

    const personalization_div = document.createElement("div");
    personalization_div.classList.add("personalization_settings");
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);

    colorInput.value = savedButton.background_color || "#1e1e1e";
    text_color_input.value = savedButton.text_color || "#ffffff";
    sizeSlider.value = savedButton.image_size || "80";

    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = document.createElement("button");
    submit_button.textContent = "Update";
    submit_button.classList.add("submit_button");
    submit_button.addEventListener("click", function () {
        if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
            updateActionsButton(button_data, folder_name, folder_data, column, row, savedButton.constructor, buttonIndex);
        } else {
            updateButton(button_data, folder_name, folder_data, column, row, savedButton.constructor, buttonIndex);
        }
        document.getElementById("button_creator_dialog").close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);
}

async function updateButton(button_data, folder_name, folder_data, column, row, constructor_id, buttonIndex) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return;
    }

    const replacePlaceholders = createReplacer(inputs, false);
    const col = Number(column);
    const r = Number(row);

    const obj = {
        command: replacePlaceholders(button_data.command),
        column: col,
        row: r,
        endcolumn: col + 1,
        endrow: r + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        toggleable: button_data.toggleable ?? false,
        constructor: constructor_id,
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    if (button_data.command === "#monitor") {
        obj.track = button_data.track;
        obj.collect_data_from = replacePlaceholders(button_data.collect_data_from);
    }

    if (button_data.command.startsWith("!")) {
        obj.min = button_data.min;
        obj.max = button_data.max;
    }

    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            const fileData = await handleFileUpload(input.files[0]);
            obj.command = obj.command.replace(new RegExp(`{${input.name}}`, 'g'), fileData?.file_path || "");
        }
    }));

    folder_data.buttons[buttonIndex] = obj;

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error updating button:", error);
    }
}

async function updateActionsButton(button_data, folder_name, folder_data, column, row, constructor_id, buttonIndex) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return;
    }

    const replacePlaceholders = createReplacer(inputs, true);
    const col = Number(column);
    const r = Number(row);

    const obj = {
        column: col,
        row: r,
        endcolumn: col + 1,
        endrow: r + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        constructor: constructor_id,
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    let hasConfiguredAction = false;

    button_data.actions.forEach(action => {
        if (!inputs[action] || inputs[action].value === "None") return;

        hasConfiguredAction = true;
        let command = replacePlaceholders(inputs[action].value);
        let variables = command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

        let parent = inputs[action].closest('.action-container');
        let inputs_container = parent.querySelector(".inputs_container");

        variables.forEach(variable => {
            let input = inputs_container.querySelector(`[name="${variable}"]`);
            if (!input) input = inputs_container.querySelector(`#${action}_${variable}`);
            if (!input && inputs[`global_${variable}`]) input = inputs[`global_${variable}`];
            if (input) command = command.replace(new RegExp(`{${variable}}`, 'g'), input.value);
        });

        obj[action] = command;
    });

    if (!hasConfiguredAction) {
        alert("Cannot save an empty button. Please configure at least one action.");
        return;
    }

    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            try {
                const fileData = await handleFileUpload(input.files[0]);
                if (fileData && fileData.file_path) {
                    Object.keys(obj).forEach(key => {
                        if (typeof obj[key] === 'string') {
                            obj[key] = obj[key].replace(new RegExp(`{${input.name.replace('global_', '')}}`, 'g'), fileData.file_path);
                        }
                    });
                }
            } catch (error) {
                console.error(`Error uploading file for ${input.name}:`, error);
            }
        }
    }));

    button_data.actions.forEach(action => {
        if (obj[action] && obj[action].startsWith("!")) {
            obj.min = button_data.min;
            obj.max = button_data.max;
        }
        if (obj[action] && obj[action] === "#monitor") {
            obj.track = button_data.track;
            if (button_data.collect_data_from) {
                obj.collect_data_from = replacePlaceholders(button_data.collect_data_from);
            }
        }
    });

    folder_data.buttons[buttonIndex] = obj;

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error updating actions button:", error);
    }
}

const setup_multiaction_edit = (button_data, folder_name, folder_data, column, row, savedButton, buttonIndex, constructor_id) => {
    const dialog = document.getElementById("button_creator_dialog");
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    const localButtonData = structuredClone(window.buttonData || {});

    const dropzone = document.createElement("DIV");
    dropzone.classList.add("multiaction_dropzone");
    dropzone.addEventListener("dragover", (e) => e.preventDefault());

    const dragHandlers = createDragHandlers(dropzone);
    dropzone.addEventListener("drop", handleDrop);
    dialog_content.appendChild(dropzone);

    function handleDrop(e) {
        e.preventDefault();
        if (e.dataTransfer.types.includes("application/x-reorder")) return;

        const id = e.dataTransfer.getData("text/plain");
        const buttonData = localButtonData?.[id];
        if (!buttonData) return;

        const container = buildMultiactionButtonContainer(id, buttonData, localButtonData, dragHandlers);
        dropzone.appendChild(container);
    }

    // Pre-populate saved actions
    if (savedButton.actions && Array.isArray(savedButton.actions)) {
        savedButton.actions.forEach(actionData => {
            if (!actionData.command) return;

            let matchedId = null;
            let matchedButtonData = null;

            for (const [id, btnData] of Object.entries(localButtonData)) {
                if (btnData.command && actionData.command.startsWith(btnData.command.split('{')[0])) {
                    matchedId = id;
                    matchedButtonData = structuredClone(btnData);
                    break;
                }
            }

            if (!matchedId) {
                // Generic container for unmatched commands
                const createElement = (tag, classes = [], attributes = {}) => {
                    const el = document.createElement(tag);
                    if (classes.length) el.classList.add(...classes);
                    if (attributes.text) el.textContent = attributes.text;
                    return el;
                };
                const buttonContainer = createElement("div", ["multiaction_button_container"]);
                buttonContainer.draggable = true;
                buttonContainer.addEventListener("dragstart", dragHandlers.handleButtonDragStart);
                buttonContainer.addEventListener("dragend", dragHandlers.handleButtonDragEnd);
                buttonContainer.addEventListener("dragover", dragHandlers.handleButtonDragOver);
                buttonContainer.dataset.command = actionData.command;

                const header = createElement("div", ["button_header"]);
                const leftContainer = createElement("div", ["buttondata_container"]);
                const title = createElement("span", ["button_title"], { text: actionData.command });
                leftContainer.appendChild(title);

                const removeBtn = createElement("span", ["buttondata_cancel"], { text: "✖" });
                removeBtn.addEventListener("click", () => buttonContainer.remove());

                header.appendChild(leftContainer);
                header.appendChild(removeBtn);
                buttonContainer.appendChild(header);
                dropzone.appendChild(buttonContainer);
                return;
            }

            // Extract pre-fill values from saved command
            const extractedValues = {};
            if (matchedButtonData.command) {
                const placeholders = matchedButtonData.command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
                const templateParts = matchedButtonData.command.split(/\s+/);
                const actualParts = actionData.command.split(/\s+/);
                placeholders.forEach(placeholder => {
                    const templateIndex = templateParts.findIndex(part => part.includes(`{${placeholder}}`));
                    if (templateIndex !== -1 && actualParts[templateIndex]) {
                        extractedValues[placeholder] = actualParts[templateIndex];
                    }
                });
            }

            const container = buildMultiactionButtonContainer(matchedId, matchedButtonData, localButtonData, dragHandlers);

            // Pre-fill extracted values after render
            setTimeout(() => {
                Object.entries(extractedValues).forEach(([name, value]) => {
                    const inputElement = container.querySelector(`[name="${name}"]`);
                    if (inputElement) inputElement.value = value;
                });
            }, 50);

            dropzone.appendChild(container);
        });
    }

    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    setTimeout(() => {
        const button_text = document.getElementById("button_text");
        if (button_text) button_text.textContent = savedButton.btn_text || "";

        if (savedButton.image && savedButton.image !== "/static/img/empty_img.png") {
            const img = document.querySelector(".button_image");
            if (img) img.src = savedButton.image;
        }

        button_template.style.backgroundColor = savedButton.background_color || "#1e1e1e";
        const text_div = document.querySelector(".button_text_div");
        if (text_div) text_div.style.color = savedButton.text_color || "#ffffff";
    }, 50);

    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        if (attributes.text) el.textContent = attributes.text;
        return el;
    };

    const personalization_div = createElement("div", ["personalization_settings"]);
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);

    colorInput.value = savedButton.background_color || "#1e1e1e";
    text_color_input.value = savedButton.text_color || "#ffffff";
    sizeSlider.value = savedButton.image_size || "80";

    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = createElement("button", ["submit_button"], { text: "Update" });
    submit_button.addEventListener("click", () => {
        updateMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id ?? savedButton.constructor, buttonIndex);
        dialog.close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);

    async function updateMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id, buttonIndex) {
        const dialog = document.getElementById("button_creator_dialog");
        const inputs = Object.fromEntries(
            [...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input])
        );

        const actions = collectMultiactionButtons(localButtonData);
        if (!actions.length) {
            alert("Multiaction button must contain at least one button");
            return;
        }
        const obj = {
            command: "__multiaction__",
            column,
            row,
            endcolumn: column + 1,
            endrow: row + 1,
            btn_text: inputs.button_text?.value,
            background_color: inputs.background_color?.value || "#1e1e1e",
            text_color: inputs.text_color?.value || "#ffffff",
            constructor: constructor_id,
            actions
        };

        if (inputs.img_size || !document.querySelector(".button_image").src.includes("empty_img")) {
            const src = document.querySelector(".button_image").src;
            obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
            obj.image_size = inputs.img_size?.value || "80";
        }

        folder_data.buttons[buttonIndex] = obj;

        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    }
};