document.addEventListener("DOMContentLoaded", () => {
    const main_container = document.querySelector(".main-container");
    main_container.innerHTML += `
        <dialog id="button_creator_dialog" class="button_creator_container">
            <svg xmlns="http://www.w3.org/2000/svg" onclick="button_creator_dialog.close()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" stroke-width="1">
                <path d="M18 6l-12 12"></path>
                <path d="M6 6l12 12"></path>
            </svg>
            <div class="dialog_content"></div>
        </dialog>
    `;
});

// Función para generar el botón y mostrar el diálogo
const generate_button = (button_data, folder_name, folder_data, column, row) => {
    const modal = document.getElementById("button_creator_dialog");
    modal.showModal();
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
        button_data.inputs.forEach(input => dialog_content.appendChild(createInputField(input)));
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
            buildActions(button_data, folder_name, folder_data, column, row)
        }
        else {
            buildButton(button_data, folder_name, folder_data, column, row)
        }


        modal.close();
    })
    dialog_content.appendChild(submit_button);
};

const createInputField = (input) => {
    let element, type;

    if (input.TYPE === "sys folder" || input.TYPE === "sys file") {
        return createSysInputField(input);
    }

    [element, type] = input.TYPE.split(" ");



    if (!input.name) alert("Input name is undefined");

    const label = document.createElement("label");
    label.textContent = input.label || input.name;

    const _input = document.createElement(element);
    _input.name = input.name;

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

//! first option is the html input, second is the json input data
const setupSelectInput = (_input, input) => {
    let options = input.options ?? [];
    if (input.options_url) {
        get_data_from_url(input.options_url).then(data => {
            if (Array.isArray(data)) {
                options = [...options, ...data];
            } else if (typeof data === 'object' && data !== null) {
                options = { ...(options || {}), ...data };
            } else {
                console.warn("Formato inesperado en data:", data);
                options = data; // fallback
            }
            populateSelectOptions(_input, options);
        });
    } else {
        populateSelectOptions(_input, options);
    }

    _input.addEventListener("change", () => toggleDependentFields(_input.value));
    setTimeout(() => _input.dispatchEvent(new Event("change")), 0);
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


const populateSelectOptions = (_input, options) => {
    _input.innerHTML = ""; // Limpia las opciones previas

    if (Array.isArray(options)) {
        options.forEach((option, index) => {
            const _option = document.createElement("option");
            _option.value = option;
            _option.textContent = option;
            if (index === 0) _option.selected = true;
            _input.appendChild(_option);
        });
    } else if (typeof options === 'object') {
        Object.entries(options).forEach(([key, value], index) => {
            const _option = document.createElement("option");
            _option.value = key;
            _option.textContent = value;
            if (index === 0) _option.selected = true;
            _input.appendChild(_option);
        });
    }
    // click para activar el evento change (solo si hay al menos una opción)
    if (_input.options.length > 0) {
        _input.click();
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

// Crear el input para subir imágenes
function createUploadInput(imgOrSvg, dialog, gallery) {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    input.accept = "image/*";

    input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let data = await handleFileUpload(file);
        const previewImg = createGalleryImage(data.file_path, imgOrSvg, dialog);

        window.image_list.push(data.file_path);
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

async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload_file", { method: "POST", body: formData });
        let data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data;
    } catch (error) {
        console.error("Error en la subida:", error);
    }
}

// Crear una imagen en la galería
function createGalleryImage(imageSrc, imgOrSvg, dialog) {
    let element;
    let div = document.createElement("div");
    div.style.position = "relative"
    div.classList.add("gallery-image-container");

    element = document.createElement("img");
    element.src = imageSrc;

    if (imageSrc.includes("user_uploads")) {
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

                window.image_list = window.image_list.filter(image => image !== imageSrc);
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

        })



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
async function buildButton(button_data, folder_name, folder_data, column, row) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]))

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return
    }

    const replacePlaceholders = (str) => str.replace(/\{(.*?)\}/g, (match, v) => { const val = inputs[v]?.value; return (val && val !== match) ? val : ""; });

    console.log(replacePlaceholders(button_data.command))

    const obj = {
        command: replacePlaceholders(button_data.command),
        column,
        row,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
    };

    if (inputs.img_size || document.querySelector(".button_image").src.includes("/static/img/empty_img.png") === false) {
        obj.image = document.querySelector(".button_image").src.replace(/^([^\/]*\/[^\/]*\/[^\/]*)/, "");
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

async function buildActions(button_data, folder_name, folder_data, column, row) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));
    //check if on inputs are required buttons without vallues
    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return
    }

    const replacePlaceholders = (str) => str.replace(/\{(.*?)\}/g, (match, v) => { const val = inputs[v]?.value; return (val && val !== match) ? val : ""; });

    const obj = {
        column,
        row,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
    };

    // Add image handling similar to buildButton
    if (inputs.img_size || document.querySelector(".button_image").src.includes("/static/img/empty_img.png") === false) {
        obj.image = document.querySelector(".button_image").src.replace(/^([^\/]*\/[^\/]*\/[^\/]*)/, "");
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

//* when a nutton have more than one possible command
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

    Object.entries(button_data.commands).forEach(([key, value]) => {
        const option = createElement("option", "", key);
        option.value = value;
        select_options.appendChild(option);
    });

    // Global inputs - now using createInputField
    button_data.inputs
        .filter(input => input.shared === true)
        .forEach(input => {
            // Add an id prefix to distinguish global inputs
            const globalInput = { ...input, name: "global_" + input.name };
            const inputContainer = createInputField(globalInput);
            global_inputs_container.appendChild(inputContainer);
        });

    // Action containers
    const actions_fragment = document.createDocumentFragment();

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

        // Creating action inputs using createInputField
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

        action_container.append(label, action_select, inputs_container);
        actions_fragment.appendChild(action_container);
    });

    actions.appendChild(actions_fragment);
    actions.appendChild(global_inputs_container);

    return actions;
}

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