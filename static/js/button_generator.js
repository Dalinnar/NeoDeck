// button generator.js
//grabs the raw json button data, and makes the necesary imputs and modifications to to make a valid button
document.addEventListener("DOMContentLoaded", () => {
    const main_container = document.querySelector(".main-container");
    main_container.innerHTML += `
        <dialog id="button_creator_dialog" class="button_creator_container">
            <svg xmlns="http://www.w3.org/2000/svg" onclick="button_creator_dialog.close(); window.dialogopen = false;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" stroke-width="1">
                <path d="M18 6l-12 12"></path>
                <path d="M6 6l12 12"></path>
            </svg>
            <div class="dialog_content"></div>
        </dialog>
    `;
});


const setup_multiaction = (button_data, folder_name, folder_data, column, row) => {
    const dialog = document.getElementById("button_creator_dialog");
    const dialog_content = document.querySelector(".dialog_content");

    dialog_content.innerHTML = "";

    // Hacemos un clon completo de window.buttonData
    const localButtonData = structuredClone(window.buttonData || {});

    // Create and setup dropzone
    const dropzone = document.createElement("DIV");
    dropzone.classList.add("multiaction_dropzone");
    dropzone.addEventListener("dragover", (e) => e.preventDefault());
    dropzone.addEventListener("drop", handleDrop);
    dialog_content.appendChild(dropzone);

    // Helper function to create element with attributes
    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        if (attributes.text) el.textContent = attributes.text;
        if (attributes.src) el.src = attributes.src;
        if (attributes.dataId) el.dataset.id = attributes.dataId;
        return el;
    };

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

        if (afterElement == null) {
            dropzone.appendChild(draggedContainer);
        } else {
            dropzone.insertBefore(draggedContainer, afterElement);
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".multiaction_button_container:not(.dragging)")];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Handle dropped buttons (new buttons from outside)
    function handleDrop(e) {
        e.preventDefault();

        // Check if this is a reorder operation
        const isReorder = e.dataTransfer.types.includes("application/x-reorder");
        if (isReorder) return;

        const id = e.dataTransfer.getData("text/plain");
        const buttonData = localButtonData?.[id];
        if (!buttonData) return;

        const buttonContainer = createElement("div", ["multiaction_button_container"]);
        buttonContainer.draggable = true;
        buttonContainer.addEventListener("dragstart", handleButtonDragStart);
        buttonContainer.addEventListener("dragend", handleButtonDragEnd);
        buttonContainer.addEventListener("dragover", handleButtonDragOver);

        buttonContainer.dataset.buttonId = id;

        const header = createElement("div", ["button_header"]);

        const leftContainer = createElement("div", ["buttondata_container"]);

        const img = createElement("img", [], {
            src: buttonData.style?.image
                ? `/static/img/${buttonData.style.image}`
                : "/static/img/key.png"
        });

        const title = createElement("span", ["button_title"], {
            text: buttonData.ButtonTitle || "Button"
        });

        leftContainer.appendChild(img);
        leftContainer.appendChild(title);

        // Inputs container
        const inputsContainer = createElement("div", ["inputs_container"]);

        if (buttonData.command?.startsWith("!")) {
            buttonData.inputs ??= [];

            // Solo agregamos el slider si no existe ya
            let slide_input = buttonData.inputs.find(i => i.name === "_slider_out");
            if (!slide_input) {
                slide_input = {
                    TYPE: "input number",
                    name: "_slider_out",
                    attributes: {
                        min: buttonData.min ?? 0,
                        max: buttonData.max ?? 0
                    }
                };
                buttonData.inputs.push(slide_input);
            }

            // Aseguramos que el comando tenga la referencia al slider
            const placeholder = `{${slide_input.name}}`;
            if (!buttonData.command.includes(placeholder)) {
                buttonData.command = buttonData.command.trim() + ` ${placeholder}`;
            }
        }
        if (buttonData.commands && typeof buttonData.commands === "object" && !buttonData.command && buttonData.actions) {
            buttonData.actions = ["trigger"];
            inputsContainer.appendChild(setup_actions(buttonData, localButtonData));

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
        dropzone.appendChild(buttonContainer);
    }

    // Add template, customization controls, and submit button
    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    const personalization_div = createElement("div", ["personalization_settings"]);
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);
    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = createElement("button", ["submit_button"], { text: "Submit" });
    submit_button.addEventListener("click", () => {
        buildMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id)
        dialog.close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);

    // -------------------------------
    // FUNCIONES INTERNAS QUE USAN localButtonData
    // -------------------------------
    function collectMultiactionButtons(localButtonData) {
        const actions = [];

        document.querySelectorAll(".multiaction_button_container").forEach(container => {
            const buttonData = localButtonData?.[container.dataset.buttonId];
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

    async function buildMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id) {
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
            obj.image = src.startsWith(window.location.origin)
                ? src.replace(window.location.origin, "")
                : src;
            obj.image_size = inputs.img_size?.value || "80";
        }

        folder_data.buttons.push(obj);

        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    }

    function setup_actions(button_data, localButtonData) {
        const createElement = (type, className = '', text = '') => {
            const elem = document.createElement(type);
            if (className) elem.classList.add(className);
            if (text) elem.textContent = text;
            return elem;
        };

        const actions = createElement("div");
        const global_inputs_container = createElement("div", "global-inputs-container");

        const select_options = document.createDocumentFragment();
        const noneOption = createElement("option", "", getTranslation("NONE"));
        noneOption.value = "None";
        noneOption.selected = true;
        select_options.appendChild(noneOption);

        if (button_data.commands) {
            Object.entries(button_data.commands).forEach(([key, value]) => {
                const option = createElement("option", "", key);
                option.value = value;
                option.textContent = getTranslation("option_verbose_" + key);
                select_options.appendChild(option);
            });
        }

        if (button_data.inputs && button_data.inputs.length > 0) {
            button_data.inputs
                .filter(input => input.shared === true)
                .forEach(input => {
                    const globalInput = { ...input, name: "global_" + input.name };
                    const inputContainer = createInputField(globalInput);
                    global_inputs_container.appendChild(inputContainer);
                });
        }

        const actions_fragment = document.createDocumentFragment();

        if (button_data.actions && button_data.actions.length > 0) {
            button_data.actions.forEach(action => {
                const action_container = createElement("div", "action-container");
                const label = createElement("label", "command-label", getTranslation("ACTION_NAME_" + action));
                const action_select = createElement("select", "command-select");
                action_select.name = action;
                action_select.appendChild(select_options.cloneNode(true));
                action_select.id = "command-select-" + action;
                action_select.addEventListener("change", function () { update_inputs(this); });

                const inputs_container = createElement("div", "inputs_container");

                if (button_data.inputs && button_data.inputs.length > 0) {
                    button_data.inputs
                        .filter(input => input.shared !== true)
                        .forEach(input => {
                            const actionInput = {
                                ...input,
                                name: input.name,
                                label: getTranslation("ACTION_" + input.name),
                                id: action + "_" + input.name
                            };
                            const inputContainer = createInputField(actionInput);
                            inputContainer.style.display = "none";
                            inputContainer.querySelectorAll('input, select, textarea').forEach(elem => {
                                elem.disabled = true;
                                elem.id = action + "_" + input.name;
                                elem.style.display = "block";
                            });
                            inputs_container.appendChild(inputContainer);
                        });
                }

                action_container.append(label, action_select, inputs_container);
                actions_fragment.appendChild(action_container);
            });
        }

        actions.appendChild(actions_fragment);
        actions.appendChild(global_inputs_container);

        return actions;
    }
};



function setup_actions(button_data) {
    const createElement = (type, className = '', text = '') => {
        const elem = document.createElement(type);
        if (className) elem.classList.add(className);
        if (text) elem.textContent = text;
        return elem;
    };

    const actions = createElement("div");
    const global_inputs_container = createElement("div", "global-inputs-container");

    // Create base select options
    const select_options = document.createDocumentFragment();
    const noneOption = createElement("option", "", getTranslation("NONE"));
    noneOption.value = "None";
    noneOption.selected = true;
    select_options.appendChild(noneOption);

    // Ensure commands exist before iterating
    if (button_data.commands) {
        Object.entries(button_data.commands).forEach(([key, value]) => {
            const option = createElement("option", "", key);
            option.value = value;
            option.textContent = getTranslation("option_verbose_" + key);
            select_options.appendChild(option);
        });
    }

    // Global inputs - handle the case where inputs may not exist
    if (button_data.inputs && button_data.inputs.length > 0) {
        button_data.inputs
            .filter(input => input.shared === true)
            .forEach(input => {
                // Add an id prefix to distinguish global inputs
                const globalInput = { ...input, name: "global_" + input.name };
                const inputContainer = createInputField(globalInput);
                global_inputs_container.appendChild(inputContainer);
            });
    }

    // Action containers
    const actions_fragment = document.createDocumentFragment();

    // Ensure actions exist before iterating
    if (button_data.actions && button_data.actions.length > 0) {
        button_data.actions.forEach(action => {
            const action_container = createElement("div", "action-container");
            const label = createElement("label", "command-label", getTranslation("ACTION_NAME_" + action));
            const action_select = createElement("select", "command-select");
            action_select.name = action;
            action_select.appendChild(select_options.cloneNode(true));
            action_select.id = "command-select-" + action;
            action_select.addEventListener("change", function () { update_inputs(this); });

            // Container for action inputs
            const inputs_container = createElement("div", "inputs_container");

            // Creating action inputs only if inputs exist
            if (button_data.inputs && button_data.inputs.length > 0) {
                button_data.inputs
                    .filter(input => input.shared !== true)
                    .forEach(input => {
                        // Create a modified input object with action-specific properties
                        const actionInput = {
                            ...input,
                            name: input.name,
                            label: getTranslation("ACTION_" + input.name),
                            // Add an ID prefix to make it unique for this action
                            id: action + "_" + input.name
                        };

                        const inputContainer = createInputField(actionInput);

                        // Apply action-specific styling and behavior
                        inputContainer.style.display = "none";
                        inputContainer.querySelectorAll('input, select, textarea').forEach(elem => {
                            elem.disabled = true;
                            elem.id = action + "_" + input.name;
                            elem.style.display = "block";
                        });

                        inputs_container.appendChild(inputContainer);
                    });
            }

            action_container.append(label, action_select, inputs_container);
            actions_fragment.appendChild(action_container);
        });
    }

    actions.appendChild(actions_fragment);
    actions.appendChild(global_inputs_container);

    return actions;
}

// Función para generar el botón y mostrar el diálogo
const generate_button = (button_data, folder_name, folder_data, column, row, constructor_id = null) => {
    const modal = document.getElementById("button_creator_dialog");
    if (button_data.command == "__multiaction__") {
        modal.show();
        window.dialogopen = true
        setup_multiaction(button_data, folder_name, folder_data, column, row)
        return;
    }
    modal.showModal();
    window.dialogopen = true
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    //create the text button_input
    text_generic = document.createElement("input");
    text_generic.name = "button_text";
    text_generic.setAttribute("type", "text");
    text_generic.setAttribute("placeholder", "Button Text");
    text_generic.addEventListener("input", () => {
        //grab the element wit id "button_text"
        button_text = document.getElementById("button_text");
        button_text.textContent = text_generic.value;
    });

    dialog_content.appendChild(text_generic);


    //check if the button_data has commands, is a object and dont have a command
    if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
        //call a function to build and select the actions
        dialog_content.appendChild(setup_actions(button_data));
    }
    else {
        button_data.inputs?.forEach(input => dialog_content.appendChild(createInputField(input)));
    }

    // Crear contenedor del botón
    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    // Crear controles de personalización

    //personalization div
    const personalization_div = document.createElement("div");
    personalization_div.classList.add("personalization_settings");
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);
    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);


    // Botón de enviar
    const submit_button = document.createElement("button");
    submit_button.textContent = "Submit";
    submit_button.classList.add("submit_button");
    //click event function
    submit_button.addEventListener("click", function () {
        if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
            //call a function to build and select the actions
            buildActions(button_data, folder_name, folder_data, column, row, constructor_id)
        }
        else {
            buildButton(button_data, folder_name, folder_data, column, row, constructor_id)
        }


        modal.close();
        window.dialogopen = false
    })
    dialog_content.appendChild(submit_button);
};

// Generic replacePlaceholders function
function createReplacer(inputs, useGlobalFallback = false, maxDepth = 10) {
    const replaceOnce = (str) =>
        str.replace(/\{(.*?)\}/g, (match, v) => {
            let key = v;

            if (useGlobalFallback && !inputs[v]) {
                key = `global_${v}`;
            }

            const input = inputs[key];
            if (!input) return "";

            if (input.type === "checkbox") {
                return input.checked;
            }

            return input.value ?? "";
        });

    return (str) => {
        let result = str;
        let depth = 0;

        while (depth < maxDepth) {
            const replaced = replaceOnce(result);

            // Stop if no more changes
            if (replaced === result) break;

            result = replaced;
            depth++;
        }

        return result;
    };
}




// ========================================
// BUILD BUTTON
// ========================================
async function buildButton(button_data, folder_name, folder_data, column, row, constructor_id) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]))

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return
    }

    const replacePlaceholders = createReplacer(inputs, false); // Disable global fallback

    const obj = {
        command: replacePlaceholders(button_data.command),
        column,
        row,
        endcolumn: column + 1,
        endrow: row + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        toggleable: button_data.toggleable ?? false,
        constructor: constructor_id,
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;

        // Si es una imagen del mismo servidor, recortar el origen
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

    folder_data.buttons.push(obj);

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error processing inputs:", error);
    }
}

// ========================================
// BUILD ACTIONS
// ========================================
async function buildActions(button_data, folder_name, folder_data, column, row, constructor_id) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));

    //PRINT ALL INPUTS NAMES
    Object.values(inputs).forEach(input => console.log(input.name, input.value));

    //check if on inputs are required buttons without vallues
    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return
    }

    const replacePlaceholders = createReplacer(inputs, true); // Enable global fallback

    const obj = {
        column,
        row,
        endcolumn: column + 1,
        endrow: row + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        constructor: constructor_id,
    };

    // Add image handling similar to buildButton
    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;

        // Si es una imagen del mismo servidor, recortar el origen
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    // Check if any actions are configured
    let hasConfiguredAction = false;

    // Iterate over each action in button_data
    button_data.actions.forEach(action => {
        if (!inputs[action] || inputs[action].value === "None") {
            return;
        }

        hasConfiguredAction = true;

        let command = replacePlaceholders(inputs[action].value); // Replace placeholders
        console.log("action:", action, "command:", command);

        let variables = command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
        console.log("variables:", variables);

        // Find the parent action container with the inputs_container
        let parent = inputs[action].closest('.action-container');
        let inputs_container = parent.querySelector(".inputs_container");

        variables.forEach(variable => {
            // Look for inputs by name, considering our new structure
            let input = inputs_container.querySelector(`[name="${variable}"]`);
            if (!input) {
                // Also try with action prefix since we're now using IDs with prefixes
                input = inputs_container.querySelector(`#${action}_${variable}`);
            }

            // If not found in action-specific inputs, check global inputs
            if (!input && inputs[`global_${variable}`]) {
                input = inputs[`global_${variable}`];
            }

            if (input) {
                command = command.replace(new RegExp(`{${variable}}`, 'g'), input.value);
            }
        });

        obj[action] = command;
    });

    // If no actions are configured, alert and return early
    if (!hasConfiguredAction) {
        alert("Cannot save an empty button. Please configure at least one action.");
        return; // Exit the function early
    }

    // Process all file inputs
    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            try {
                const fileData = await handleFileUpload(input.files[0]);
                if (fileData && fileData.file_path) {
                    // Replace placeholders in all commands
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

    // Add special handling for specific commands if needed
    // Example: if there are special cases like in buildButton
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

    // Add the action object to folder_data
    folder_data.buttons.push(obj);

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
        console.log("Button created successfully with actions:", obj);
    } catch (error) {
        console.error("Error processing inputs:", error);
    }
}

//* when a button have more than one possible command

function update_inputs(selectElement) {
    const parent = selectElement.parentElement;
    const selected_option = selectElement.options[selectElement.selectedIndex];
    const variables = selected_option.value.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

    parent.querySelectorAll(':scope > .inputs_container > div').forEach(container => {
        // Get the input element in this container
        const inputElements = container.querySelectorAll('input, select, textarea');

        if (inputElements.length > 0) {
            const inputElement = inputElements[0];
            const inputName = inputElement.name;
            const shouldShow = variables.includes(inputName);

            // Show/hide the entire container
            container.style.display = shouldShow ? "block" : "none";

            // Enable/disable the input
            inputElement.disabled = !shouldShow;

            // Clear values if hiding
            if (!shouldShow) {
                if (inputElement.tagName === "INPUT" || inputElement.tagName === "TEXTAREA") {
                    inputElement.value = "";
                } else if (inputElement.tagName === "SELECT" && inputElement.options.length > 0) {
                    inputElement.selectedIndex = 0;
                }
            }
        }
    });
}


const createInputField = (input) => {
    let element, type;

    if (input.TYPE === "sys folder" || input.TYPE === "sys file") {
        return createSysInputField(input);
    }
    //macro input
    if (input.TYPE == "macro_rec") {
        return createMacroInput(input);
    }

    [element, type] = input.TYPE.split(" ");



    if (!input.name) alert("Input name is undefined");

    const label = document.createElement("label");
    label.textContent = input.label || input.name;

    const _input = document.createElement(element);
    _input.name = input.name;

    //setup attributes
    Object.entries(input.attributes ?? {}).forEach(([k, v]) => _input.setAttribute(k, v));

    if (input.required) {
        _input.required = true;
    }

    if (element === "input" && type) {
        _input.setAttribute("type", type);
    }

    if (input.id) _input.id = input.id;

    if (element === "select") setupSelectInput(_input, input);

    if (element === "input" && type === "checkbox") { setupCheckboxInput(_input, input); }

    const container = document.createElement("div");
    container.classList.add("input-container");

    if (input.dependant_on) {
        container.style.display = "none";
        _input.setAttribute("data-dependant", input.dependant_on);
        container.setAttribute("data-dependant", input.dependant_on);
    }

    container.appendChild(label);
    container.appendChild(_input);
    setup_input(_input)
    return container;
};

//function to make small changes to the inputs after they are created
function setup_input(input) {
    if (input.type === "checkbox") {
        input.parentElement.style.flexDirection = "row-reverse";
        input.parentElement.style.justifyContent = "start";
    }
}
const createSysInputField = (input) => {
    const container = document.createElement("div");
    container.classList.add("input-container");

    const label = document.createElement("label");
    label.textContent = input.label || input.name;

    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("sys-input-wrapper");
    inputWrapper.style.display = "flex";

    const _input = document.createElement("input");
    _input.name = input.name;
    _input.type = "text";
    _input.readOnly = true;
    _input.style.flexGrow = "1";

    if (input.id) _input.id = input.id;

    const browseButton = document.createElement("button");
    browseButton.textContent = "...";
    browseButton.type = "button";
    browseButton.classList.add("browse-button");
    browseButton.style.width = "30px";

    browseButton.addEventListener("click", async () => {
        try {
            const endpoint = input.TYPE === "sys folder" ? "/get_sysfolder" : "/get_sysfile";
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.path) {
                _input.readOnly = false;
                _input.value = data.path;
                _input.readOnly = true;
                _input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        } catch (error) {
            console.error("Error fetching system path:", error);
            alert(`Failed to get ${input.TYPE === "sys folder" ? "folder" : "file"} path. Please try again.`);
        }
    });

    inputWrapper.appendChild(_input);
    inputWrapper.appendChild(browseButton);
    container.appendChild(label);
    container.appendChild(inputWrapper);

    return container;
};

const createMacroInput = (input) => {
    const container = document.createElement("div");
    container.classList.add("input-container");

    const label = document.createElement("label");
    label.textContent = input.label || input.name;

    const hiddenInput = document.createElement("textarea");
    hiddenInput.name = input.name;
    hiddenInput.classList.add("macro-hidden-input");
    if (input.id) hiddenInput.id = input.id;

    const macroDisplay = document.createElement("div");
    macroDisplay.classList.add("macro-recorder");
    macroDisplay.setAttribute("tabindex", "0");

    const placeholder = document.createElement("span");
    placeholder.textContent = "Click to record shortcut...";
    placeholder.classList.add("macro-placeholder");
    macroDisplay.appendChild(placeholder);

    let isRecording = false;
    // Each item is either { type: "combo", value: "Ctrl+a" } or { type: "delay", ms: 10 }
    let recordedItems = [];
    let heldKeys = new Set();
    let currentCombo = null;

    const DEFAULT_DELAY_MS = 10;

    const MODIFIERS = ["Control", "Alt", "Shift", "Meta"];
    const MODIFIER_LABELS = { Control: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Meta" };

    const updateHiddenInput = () => {
        // Output format: ["Ctrl+a", "@wait_10ms", "Alt+d", ...]
        const serialized = recordedItems.map(item =>
            item.type === "combo" ? item.value : `@wait_${item.ms}ms`
        );
        hiddenInput.value = JSON.stringify(serialized);
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const buildComboFromHeld = () => {
        if (heldKeys.size === 0) return null;
        const modifiers = MODIFIERS.filter(m => heldKeys.has(m));
        const normal = [...heldKeys]
            .filter(k => !MODIFIERS.includes(k))
            .map(k => k === " " ? "Space" : k);
        const parts = [...modifiers.map(m => MODIFIER_LABELS[m]), ...normal];
        return parts.length > 0 ? parts.join("+") : null;
    };

    const createDelayTag = (item, index) => {
        const tag = document.createElement("span");
        tag.classList.add("macro-delay-tag");

        const downBtn = document.createElement("button");
        downBtn.textContent = "▾";
        downBtn.classList.add("macro-delay-btn");
        downBtn.type = "button";

        const valueSpan = document.createElement("span");
        valueSpan.classList.add("macro-delay-value");
        valueSpan.textContent = `@${item.ms}ms`;

        const upBtn = document.createElement("button");
        upBtn.textContent = "▴";
        upBtn.classList.add("macro-delay-btn");
        upBtn.type = "button";

        const removeBtn = document.createElement("span");
        removeBtn.textContent = "×";
        removeBtn.classList.add("macro-tag-remove");

        const updateValue = (delta) => {
            item.ms = Math.max(0, item.ms + delta);
            valueSpan.textContent = `@${item.ms}ms`;
            updateHiddenInput();
        };

        // Click buttons
        downBtn.addEventListener("click", (e) => { e.stopPropagation(); updateValue(-10); });
        upBtn.addEventListener("click", (e) => { e.stopPropagation(); updateValue(+10); });

        // Arrow keys while hovering the delay tag
        tag.addEventListener("keydown", (e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); updateValue(+10); }
            if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); updateValue(-10); }
        });

        // Scroll wheel
        tag.addEventListener("wheel", (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateValue(e.deltaY < 0 ? +10 : -10);
        }, { passive: false });

        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            recordedItems.splice(index, 1);
            renderKeys();
            updateHiddenInput();
        });

        tag.setAttribute("tabindex", "0");
        tag.appendChild(downBtn);
        tag.appendChild(valueSpan);
        tag.appendChild(upBtn);
        tag.appendChild(removeBtn);
        return tag;
    };

    const createComboTag = (item, index) => {
        const tag = document.createElement("span");
        tag.textContent = item.value;
        tag.classList.add("macro-tag");

        const removeBtn = document.createElement("span");
        removeBtn.textContent = "×";
        removeBtn.classList.add("macro-tag-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            recordedItems.splice(index, 1);
            renderKeys();
            updateHiddenInput();
        });

        tag.appendChild(removeBtn);
        return tag;
    };

    const renderKeys = () => {
        macroDisplay.innerHTML = "";

        if (recordedItems.length === 0 && !currentCombo) {
            macroDisplay.appendChild(placeholder);
        } else {
            recordedItems.forEach((item, i) => {
                if (item.type === "combo") {
                    macroDisplay.appendChild(createComboTag(item, i));
                } else {
                    macroDisplay.appendChild(createDelayTag(item, i));
                }
            });

            if (currentCombo) {
                const preview = document.createElement("span");
                preview.textContent = currentCombo;
                preview.classList.add("macro-preview-tag");
                macroDisplay.appendChild(preview);
            }
        }

        if (isRecording) {
            const indicator = document.createElement("span");
            indicator.textContent = "● Recording...";
            indicator.classList.add("macro-recording-indicator");
            macroDisplay.appendChild(indicator);
            macroDisplay.classList.add("macro-recorder--recording");
        } else {
            macroDisplay.classList.remove("macro-recorder--recording");
        }
    };

    const onKeyDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        heldKeys.add(e.key);
        currentCombo = buildComboFromHeld();
        renderKeys();
    };

    const onKeyUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        heldKeys.delete(e.key);

        if (heldKeys.size === 0 && currentCombo) {
            // If there's already a previous combo, insert a delay between them
            if (recordedItems.length > 0 && recordedItems[recordedItems.length - 1].type === "combo") {
                recordedItems.push({ type: "delay", ms: DEFAULT_DELAY_MS });
            }
            recordedItems.push({ type: "combo", value: currentCombo });
            currentCombo = null;
            renderKeys();
            updateHiddenInput();
        }
    };

    macroDisplay.addEventListener("click", () => {
        isRecording = !isRecording;

        if (isRecording) {
            macroDisplay.addEventListener("keydown", onKeyDown);
            macroDisplay.addEventListener("keyup", onKeyUp);
            macroDisplay.focus();
        } else {
            macroDisplay.removeEventListener("keydown", onKeyDown);
            macroDisplay.removeEventListener("keyup", onKeyUp);
            heldKeys.clear();
            currentCombo = null;
        }

        renderKeys();
    });

    macroDisplay.addEventListener("blur", (e) => {
        // Don't stop recording if focus moved to a delay tag inside the recorder
        if (macroDisplay.contains(e.relatedTarget)) return;

        if (isRecording) {
            isRecording = false;
            macroDisplay.removeEventListener("keydown", onKeyDown);
            macroDisplay.removeEventListener("keyup", onKeyUp);
            heldKeys.clear();
            currentCombo = null;
            renderKeys();
        }
    });

    container.appendChild(label);
    container.appendChild(macroDisplay);
    container.appendChild(hiddenInput);

    return container;
};

//! first option is the html input, second is the json input data
const setupSelectInput = (_input, input) => {
    let options = input.options ?? [];
    // 1) Si hay URL para cargar opciones, cargarlas y poblar
    if (input.options_url) {
        get_data_from_url(input.options_url).then(data => {
            if (Array.isArray(data)) {
                options = [...options, ...data];
            } else if (typeof data === 'object' && data !== null) {
                options = { ...(options || {}), ...data };
            } else {
                console.warn("Formato inesperado en data:", data);
                options = data;
            }
            populateSelectOptions(_input, options, false); // <-- usar sin verbose
        });
    } else {
        populateSelectOptions(_input, options, true); // <-- usar verbose
    }

    // 2) Solo si es el select “padre” (no tiene `dependant_on`), le ponemos el listener:
    if (!input.dependant_on) {
        _input.addEventListener("change", () => toggleDependentFields(_input.value));
        // y forzamos la primera ejecución tras poblar:
        setTimeout(() => _input.dispatchEvent(new Event("change")), 0);
    }
};

const setupCheckboxInput = (_input, input) => {
    _input.addEventListener("change", () => {
        const dependantFields = document.querySelectorAll(`[data-dependant="${input.name}"]`);
        dependantFields.forEach(field => {
            if (_input.checked) {
                field.style.display = "block";
            } else {
                field.style.display = "none";
            }
        });
    });
};

const populateSelectOptions = (_input, options, useVerbose = true) => {
    _input.innerHTML = "";

    if (Array.isArray(options)) {
        options.forEach((opt, i) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = useVerbose ? getTranslation("select_verbose_" + opt) : opt;
            if (i === 0) o.selected = true;
            _input.appendChild(o);
        });
    } else if (typeof options === 'object') {
        Object.entries(options).forEach(([k, v], i) => {
            const o = document.createElement("option");
            o.value = k;
            o.textContent = useVerbose ? getTranslation("select_verbose_" + v) : v;
            if (i === 0) o.selected = true;
            _input.appendChild(o);
        });
    }
};

//function toggle fields based on selected value and remove the content
const toggleDependentFields = (selectedValue) => {
    document.querySelectorAll("[data-dependant]").forEach(dep => {
        const input = dep.querySelector("input, select, textarea");
        dep.style.display = dep.getAttribute("data-dependant") === selectedValue ? "flex" : "none";
        if (input) input.disabled = dep.style.display === "none", input.value = "";
    });
};

const createButtonTemplate = (button_data) => {
    const button_template = document.createElement("div");
    button_template.classList.add("button_template");
    button_template.style.backgroundColor = "#393939";

    const text_div = document.createElement("div");
    text_div.classList.add("button_text_div");

    const button_text = document.createElement("h3");
    button_text.textContent = "";
    button_text.name = "button_text";
    button_text.id = "button_text";
    text_div.appendChild(button_text);

    button_template.appendChild(text_div);


    if (button_data.command === "#monitor") {
        Initialize_monitors();
        const h2 = document.createElement("h2");
        const { collect_data_from } = button_data;


        // if no variables, set data_from directly
        if (!collect_data_from.includes("{") && !collect_data_from.includes("}")) {
            h2.setAttribute("data_from", collect_data_from ?? "");
        } else {
            const variables = collect_data_from.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

            // fucntion that updates the "data_from" based on inputs
            const updateDataFrom = () => {
                let updatedDataFrom = collect_data_from;
                variables.forEach(variable => {
                    const input = document.querySelector(`[name="${variable}"]`);
                    if (input) {
                        let inputValue = input.value || (input.tagName === "SELECT" && input.options[0]?.value) || "";
                        updatedDataFrom = updatedDataFrom.replace(new RegExp(`{${variable}}`, "g"), inputValue);
                    }
                });
                h2.setAttribute("data_from", updatedDataFrom);
            };

            //initial update and input event for inputs
            updateDataFrom();
            variables.forEach(variable => {
                const input = document.querySelector(`[name="${variable}"]`);
                if (input) {
                    input.addEventListener("input", updateDataFrom);
                    if (input.tagName === "SELECT") input.addEventListener("click", updateDataFrom);
                }
            });
        }
        text_div.appendChild(h2);
    }
    //if the button command starts with "!", it is a level
    if (button_data.command?.startsWith("!")) {
        const rangeInput = document.createElement("input");
        rangeInput.type = "range";
        rangeInput.classList.add("slider");
        rangeInput.min = button_data.min ?? 0;
        text_div.style.zIndex = "3";
        text_div.style.bottom = "0";

        rangeInput.max = button_data.max ?? 100;
        rangeInput.style.writingMode = "sideways-lr";
        rangeInput.style.position = "absolute";
        rangeInput.style.height = "95%";
        rangeInput.style.width = "inherit";
        button_template.appendChild(rangeInput);
    }


    const img = document.createElement("img");
    let imageSource = button_data.style?.image ?? "empty_img.png";
    imageSource = imageSource || "empty_img.png";
    img.src = imageSource.includes("/") ? imageSource : `/static/img/${imageSource}`;
    img.classList.add("button_image");
    img.style.width = "80%";
    img.style.height = "auto";
    button_template.appendChild(img);

    // Evento para abrir la galería de imágenes al hacer clic
    button_template.addEventListener("click", () => open_image_gallery(img));

    return button_template;
};


const createCustomizationControls = (button_template) => {

    //background color
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.name = "background_color";
    colorInput.id = "button_color_input";
    colorInput.value = "#1e1e1e";
    colorInput.addEventListener("input", (e) => button_template.style.backgroundColor = e.target.value);

    //text color
    let text_div = document.getElementsByClassName("button_text_div")[0];

    const text_color_input = document.createElement("input");
    text_color_input.type = "color";
    text_color_input.id = "text_color_input";
    text_color_input.name = "text_color";
    text_color_input.addEventListener("input", (e) => text_div.style.color = e.target.value);


    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Color:";
    colorLabel.htmlFor = colorInput.id;

    const sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.name = "img_size";
    sizeSlider.min = "0";
    sizeSlider.max = "100";
    sizeSlider.value = "80";
    sizeSlider.addEventListener("input", (e) => {
        const imgOrSvg = button_template.querySelector("img") || button_template.querySelector("svg");
        imgOrSvg.style.width = e.target.value + "%";
    });

    return { colorLabel, colorInput, text_color_input, sizeSlider };
};

function get_data_from_url(url) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return data;
        })
        .catch(error => console.error(error));
}

function open_image_gallery(img) {
    let image_list = window.image_list;

    // Si el diálogo ya existe, eliminarlo
    document.getElementById("image_dialog")?.remove();

    // Crear y mostrar el diálogo
    const dialog = createImageDialog();
    const gallery = dialog.querySelector("#image_gallery");


    //create a input for link upload
    const link_input = document.createElement("input");
    link_input.type = "text";
    link_input.placeholder = "Link de la imagen";

    link_input.addEventListener("input", (e) => {
        const link = e.target.value;
        if (link) {
            img.src = link;
            console.log(link);
            dialog.close();
        }
    });

    dialog.prepend(link_input);

    // Crear input de subida y botón de carga
    const input = createUploadInput(img, dialog, gallery);
    const uploadButton = createUploadButton(input);

    //create a div for no image
    const no_image = document.createElement("div");
    no_image.classList.add("no-image");
    no_image.innerText = getTranslation("no_image_generic");
    no_image.onclick = () => {
        img.src = "/static/img/empty_img.png";
        dialog.close();
    }

    gallery.append(no_image);


    // Agregar el botón de subida a la galería
    gallery.append(input, uploadButton);

    // Agregar imágenes existentes a la galería
    image_list.forEach(imageSrc => gallery.append(createGalleryImage(imageSrc, img, dialog)));

    // Agregar el botón de cierre
    const closeButton = document.createElement("button");
    closeButton.innerText = "Cerrar";
    closeButton.classList.add("close-button");
    closeButton.addEventListener("click", () => dialog.close());

    dialog.append(closeButton);
    document.body.appendChild(dialog);
    dialog.showModal();
}

// Crear el diálogo de imágenes
function createImageDialog() {
    const dialog = document.createElement("dialog");
    dialog.id = "image_dialog";
    dialog.classList.add("image-dialog");

    const gallery = document.createElement("div");
    gallery.id = "image_gallery";
    gallery.classList.add("image-gallery");

    dialog.appendChild(gallery);
    return dialog;
}

// Fixed createUploadInput function
function createUploadInput(imgOrSvg, dialog, gallery) {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    input.accept = "image/*";

    input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let data = await handleFileUpload(file);

        // Check if data is valid before proceeding
        if (!data) {
            console.error("Invalid data received from file upload");
            console.log("Data:", data);
            return;
        }

        const previewImg = createGalleryImage(data, imgOrSvg, dialog);

        // Make sure window.image_list exists before pushing to it
        if (!window.image_list) {
            window.image_list = [];
        }

        window.image_list.push(data);
        gallery.insertBefore(previewImg, gallery.children[3]);
    });

    return input;
}

// Crear botón para subir imágenes
function createUploadButton(input) {
    const upload_div = document.createElement("div");
    upload_div.classList.add("upload-button");

    upload_div.innerText = getTranslation("upload_image_generic");
    upload_div.addEventListener("click", () => input.click());
    return upload_div;
}

// Fixed handleFileUpload function
async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload_file", { method: "POST", body: formData });
        let data = await response.json();
        if (!data.success) throw new Error(data.message || "Upload failed");
        return data;
    } catch (error) {
        console.error("Error en la subida:", error);
        return null; // Return null so we can check for it
    }
}

// Crear una imagen en la galería
// Fixed createGalleryImage function
function createGalleryImage(imageSrc, imgOrSvg, dialog) {
    // Guard clause to prevent errors with undefined/null imageSrc
    if (!imageSrc) {
        console.error("Invalid image source provided to createGalleryImage");
        return document.createElement("div"); // Return empty div to avoid breaking the flow
    }

    let element;
    let div = document.createElement("div");
    div.style.position = "relative"
    div.classList.add("gallery-image-container");

    element = document.createElement("img");
    element.src = imageSrc;

    // Check if imageSrc is a string before calling includes
    if (typeof imageSrc === 'string' && imageSrc.includes("user_uploads")) {
        let deleteteButton = document.createElement("div");
        deleteteButton.classList.add("delete-button");

        // Add SVG 'X' icon
        deleteteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" 
                 viewBox="0 0 24 24" 
                 width="24" height="24" 
                 fill="red">
                <path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.89 4.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/>
            </svg>
        `;

        deleteteButton.style.position = "absolute";
        deleteteButton.style.top = "5%";
        deleteteButton.style.right = "5%";
        deleteteButton.style.cursor = "pointer"; // Optional for better UX

        deleteteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            if (confirm(getTranslation("confirm_delete_image"))) {
                // Make sure window.image_list exists
                if (window.image_list) {
                    window.image_list = window.image_list.filter(image => image !== imageSrc);
                }

                div.remove();
                fetch("/delete_file", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ file_path: imageSrc })
                })
                    .then(response => {
                        if (response.ok) {
                            console.log("Archivo eliminado exitosamente");
                        } else {
                            console.error("Error al eliminar el archivo");
                        }
                    })
                    .catch(error => {
                        console.error("Error al eliminar el archivo:", error);
                    });
            }
        });

        div.appendChild(deleteteButton);
    }

    element.classList.add("gallery-image");
    div.addEventListener("click", () => {
        if (element.tagName === "IMG") {
            imgOrSvg.src = imageSrc;
        } else {
            imgOrSvg.innerHTML = `<use xlink:href="${imageSrc}"></use>`;
        }
        dialog.close();
    });
    div.appendChild(element);

    return div;
}


// Add this function to button_generator.js

function setup_regular_edit(button_data, folder_name, folder_data, column, row, savedButton, buttonIndex) {
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    // Create text input and pre-fill
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

    // Handle actions or regular inputs
    if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
        const actionsElement = setup_actions(button_data);
        dialog_content.appendChild(actionsElement);

        // Pre-fill action selects
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

            // Pre-fill input values after creation
            setTimeout(() => {
                const inputElement = inputField.querySelector(`[name="${input.name}"]`);
                if (inputElement && savedButton[input.name]) {
                    inputElement.value = savedButton[input.name];
                }
            }, 50);
        });
    }

    // Create button template
    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    // Pre-fill button preview
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

    // Create customization controls
    const personalization_div = document.createElement("div");
    personalization_div.classList.add("personalization_settings");
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);

    // Pre-fill customization values
    colorInput.value = savedButton.background_color || "#1e1e1e";
    text_color_input.value = savedButton.text_color || "#ffffff";
    sizeSlider.value = savedButton.image_size || "80";

    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    // Submit button - UPDATE instead of CREATE
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

// Add these functions to button_generator.js

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

    // UPDATE existing button instead of push
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
        if (!inputs[action] || inputs[action].value === "None") {
            return;
        }

        hasConfiguredAction = true;
        let command = replacePlaceholders(inputs[action].value);
        let variables = command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

        let parent = inputs[action].closest('.action-container');
        let inputs_container = parent.querySelector(".inputs_container");

        variables.forEach(variable => {
            let input = inputs_container.querySelector(`[name="${variable}"]`);
            if (!input) {
                input = inputs_container.querySelector(`#${action}_${variable}`);
            }
            if (!input && inputs[`global_${variable}`]) {
                input = inputs[`global_${variable}`];
            }
            if (input) {
                command = command.replace(new RegExp(`{${variable}}`, 'g'), input.value);
            }
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

    // UPDATE existing button instead of push
    folder_data.buttons[buttonIndex] = obj;

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error updating actions button:", error);
    }
}


const setup_multiaction_edit = (button_data, folder_name, folder_data, column, row, savedButton, buttonIndex) => {
    const dialog = document.getElementById("button_creator_dialog");
    const dialog_content = document.querySelector(".dialog_content");

    dialog_content.innerHTML = "";

    // Clone window.buttonData
    const localButtonData = structuredClone(window.buttonData || {});

    // Create and setup dropzone
    const dropzone = document.createElement("DIV");
    dropzone.classList.add("multiaction_dropzone");
    dropzone.addEventListener("dragover", (e) => e.preventDefault());
    dropzone.addEventListener("drop", handleDrop);
    dialog_content.appendChild(dropzone);

    // Helper function to create element with attributes
    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        if (attributes.text) el.textContent = attributes.text;
        if (attributes.src) el.src = attributes.src;
        if (attributes.dataId) el.dataset.id = attributes.dataId;
        return el;
    };

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

        if (afterElement == null) {
            dropzone.appendChild(draggedContainer);
        } else {
            dropzone.insertBefore(draggedContainer, afterElement);
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".multiaction_button_container:not(.dragging)")];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Handle dropped buttons (new buttons from outside)
    function handleDrop(e) {
        e.preventDefault();

        // Check if this is a reorder operation
        const isReorder = e.dataTransfer.types.includes("application/x-reorder");
        if (isReorder) return;

        const id = e.dataTransfer.getData("text/plain");
        const buttonData = localButtonData?.[id];
        if (!buttonData) return;

        const buttonContainer = createElement("div", ["multiaction_button_container"]);
        buttonContainer.draggable = true;
        buttonContainer.addEventListener("dragstart", handleButtonDragStart);
        buttonContainer.addEventListener("dragend", handleButtonDragEnd);
        buttonContainer.addEventListener("dragover", handleButtonDragOver);

        buttonContainer.dataset.buttonId = id;

        const header = createElement("div", ["button_header"]);

        const leftContainer = createElement("div", ["buttondata_container"]);

        const img = createElement("img", [], {
            src: buttonData.style?.image
                ? `/static/img/${buttonData.style.image}`
                : "/static/img/key.png"
        });

        const title = createElement("span", ["button_title"], {
            text: buttonData.ButtonTitle || "Button"
        });

        leftContainer.appendChild(img);
        leftContainer.appendChild(title);

        // Inputs container
        const inputsContainer = createElement("div", ["inputs_container"]);

        if (buttonData.command?.startsWith("!")) {
            buttonData.inputs ??= [];

            // Solo agregamos el slider si no existe ya
            let slide_input = buttonData.inputs.find(i => i.name === "_slider_out");
            if (!slide_input) {
                slide_input = {
                    TYPE: "input number",
                    name: "_slider_out",
                    attributes: {
                        min: buttonData.min ?? 0,
                        max: buttonData.max ?? 0
                    }
                };
                buttonData.inputs.push(slide_input);
            }

            // Aseguramos que el comando tenga la referencia al slider
            const placeholder = `{${slide_input.name}}`;
            if (!buttonData.command.includes(placeholder)) {
                buttonData.command = buttonData.command.trim() + ` ${placeholder}`;
            }
        }
        if (buttonData.commands && typeof buttonData.commands === "object" && !buttonData.command && buttonData.actions) {
            buttonData.actions = ["trigger"];
            inputsContainer.appendChild(setup_actions(buttonData, localButtonData));

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
        dropzone.appendChild(buttonContainer);
    }

    // PRE-POPULATE existing actions from savedButton
    if (savedButton.actions && Array.isArray(savedButton.actions)) {
        savedButton.actions.forEach(actionData => {
            if (!actionData.command) return;

            // Try to find matching button template
            let matchedId = null;
            let matchedButtonData = null;

            // Search through localButtonData to find a match
            for (const [id, btnData] of Object.entries(localButtonData)) {
                if (btnData.command && actionData.command.startsWith(btnData.command.split('{')[0])) {
                    matchedId = id;
                    matchedButtonData = structuredClone(btnData);
                    break;
                }
            }

            // If no match found, create a generic button container
            if (!matchedId) {
                const buttonContainer = createElement("div", ["multiaction_button_container"]);
                buttonContainer.draggable = true;
                buttonContainer.addEventListener("dragstart", handleButtonDragStart);
                buttonContainer.addEventListener("dragend", handleButtonDragEnd);
                buttonContainer.addEventListener("dragover", handleButtonDragOver);

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

            // Create full button container with matched template
            const buttonContainer = createElement("div", ["multiaction_button_container"]);
            buttonContainer.draggable = true;
            buttonContainer.addEventListener("dragstart", handleButtonDragStart);
            buttonContainer.addEventListener("dragend", handleButtonDragEnd);
            buttonContainer.addEventListener("dragover", handleButtonDragOver);

            buttonContainer.dataset.buttonId = matchedId;

            const header = createElement("div", ["button_header"]);
            const leftContainer = createElement("div", ["buttondata_container"]);

            const img = createElement("img", [], {
                src: matchedButtonData.style?.image
                    ? `/static/img/${matchedButtonData.style.image}`
                    : "/static/img/key.png"
            });

            const title = createElement("span", ["button_title"], {
                text: matchedButtonData.ButtonTitle || "Button"
            });

            leftContainer.appendChild(img);
            leftContainer.appendChild(title);

            const inputsContainer = createElement("div", ["inputs_container"]);

            // Extract values from saved command
            const extractedValues = {};
            if (matchedButtonData.command) {
                const commandPattern = matchedButtonData.command;
                const placeholders = commandPattern.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

                // Simple extraction - split by spaces and match positions
                const templateParts = commandPattern.split(/\s+/);
                const actualParts = actionData.command.split(/\s+/);

                placeholders.forEach(placeholder => {
                    const templateIndex = templateParts.findIndex(part => part.includes(`{${placeholder}}`));
                    if (templateIndex !== -1 && actualParts[templateIndex]) {
                        extractedValues[placeholder] = actualParts[templateIndex];
                    }
                });
            }

            if (matchedButtonData.command?.startsWith("!")) {
                matchedButtonData.inputs ??= [];

                let slide_input = matchedButtonData.inputs.find(i => i.name === "_slider_out");
                if (!slide_input) {
                    slide_input = {
                        TYPE: "input number",
                        name: "_slider_out",
                        attributes: {
                            min: matchedButtonData.min ?? 0,
                            max: matchedButtonData.max ?? 0
                        }
                    };
                    matchedButtonData.inputs.push(slide_input);
                }

                const placeholder = `{${slide_input.name}}`;
                if (!matchedButtonData.command.includes(placeholder)) {
                    matchedButtonData.command = matchedButtonData.command.trim() + ` ${placeholder}`;
                }
            }

            if (matchedButtonData.commands && typeof matchedButtonData.commands === "object" && !matchedButtonData.command && matchedButtonData.actions) {
                matchedButtonData.actions = ["trigger"];
                inputsContainer.appendChild(setup_actions(matchedButtonData, localButtonData));

                const chevron = createElement("span", ["button_chevron"], { text: "▼" });
                chevron.addEventListener("click", () => {
                    const isHidden = inputsContainer.classList.contains("hidden");
                    inputsContainer.classList.toggle("hidden");
                    chevron.textContent = isHidden ? "▼" : "▲";
                });
                leftContainer.appendChild(chevron);
            } else if (matchedButtonData.inputs?.length) {
                matchedButtonData.inputs.forEach(input => {
                    const inputField = createInputField(input);
                    inputsContainer.appendChild(inputField);

                    // Pre-fill extracted values
                    setTimeout(() => {
                        const inputElement = inputField.querySelector(`[name="${input.name}"]`);
                        if (inputElement && extractedValues[input.name]) {
                            inputElement.value = extractedValues[input.name];
                        }
                    }, 50);
                });

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
            dropzone.appendChild(buttonContainer);
        });
    }

    // Add template, customization controls, and submit button
    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    // Pre-fill button template values
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

    const personalization_div = createElement("div", ["personalization_settings"]);
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);

    // Pre-fill customization values
    colorInput.value = savedButton.background_color || "#1e1e1e";
    text_color_input.value = savedButton.text_color || "#ffffff";
    sizeSlider.value = savedButton.image_size || "80";

    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = createElement("button", ["submit_button"], { text: "Update" });
    submit_button.addEventListener("click", () => {
        updateMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, savedButton.constructor, buttonIndex);
        dialog.close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);

    // -------------------------------
    // HELPER FUNCTIONS
    // -------------------------------
    function collectMultiactionButtons(localButtonData) {
        const actions = [];

        document.querySelectorAll(".multiaction_button_container").forEach(container => {
            const buttonData = localButtonData?.[container.dataset.buttonId];

            // Handle generic command containers (no matched template)
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
            obj.image = src.startsWith(window.location.origin)
                ? src.replace(window.location.origin, "")
                : src;
            obj.image_size = inputs.img_size?.value || "80";
        }

        // UPDATE existing button instead of push
        folder_data.buttons[buttonIndex] = obj;

        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    }

    function setup_actions(button_data, localButtonData) {
        const createElement = (type, className = '', text = '') => {
            const elem = document.createElement(type);
            if (className) elem.classList.add(className);
            if (text) elem.textContent = text;
            return elem;
        };

        const actions = createElement("div");
        const global_inputs_container = createElement("div", "global-inputs-container");

        const select_options = document.createDocumentFragment();
        const noneOption = createElement("option", "", getTranslation("NONE"));
        noneOption.value = "None";
        noneOption.selected = true;
        select_options.appendChild(noneOption);

        if (button_data.commands) {
            Object.entries(button_data.commands).forEach(([key, value]) => {
                const option = createElement("option", "", key);
                option.value = value;
                option.textContent = getTranslation("option_verbose_" + key);
                select_options.appendChild(option);
            });
        }

        if (button_data.inputs && button_data.inputs.length > 0) {
            button_data.inputs
                .filter(input => input.shared === true)
                .forEach(input => {
                    const globalInput = { ...input, name: "global_" + input.name };
                    const inputContainer = createInputField(globalInput);
                    global_inputs_container.appendChild(inputContainer);
                });
        }

        const actions_fragment = document.createDocumentFragment();

        if (button_data.actions && button_data.actions.length > 0) {
            button_data.actions.forEach(action => {
                const action_container = createElement("div", "action-container");
                const label = createElement("label", "command-label", getTranslation("ACTION_NAME_" + action));
                const action_select = createElement("select", "command-select");
                action_select.name = action;
                action_select.appendChild(select_options.cloneNode(true));
                action_select.id = "command-select-" + action;
                action_select.addEventListener("change", function () { update_inputs(this); });

                const inputs_container = createElement("div", "inputs_container");

                if (button_data.inputs && button_data.inputs.length > 0) {
                    button_data.inputs
                        .filter(input => input.shared !== true)
                        .forEach(input => {
                            const actionInput = {
                                ...input,
                                name: input.name,
                                label: getTranslation("ACTION_" + input.name),
                                id: action + "_" + input.name
                            };
                            const inputContainer = createInputField(actionInput);
                            inputContainer.style.display = "none";
                            inputContainer.querySelectorAll('input, select, textarea').forEach(elem => {
                                elem.disabled = true;
                                elem.id = action + "_" + input.name;
                                elem.style.display = "block";
                            });
                            inputs_container.appendChild(inputContainer);
                        });
                }

                action_container.append(label, action_select, inputs_container);
                actions_fragment.appendChild(action_container);
            });
        }

        actions.appendChild(actions_fragment);
        actions.appendChild(global_inputs_container);

        return actions;
    }
};