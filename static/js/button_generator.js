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


    //* esto me genera el input para el nombre del boton
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
    const [element, type] = input.TYPE.split(" ");
    if (!input.name) alert("Input name is undefined");

    const label = document.createElement("label");
    label.textContent = input.label;

    const _input = document.createElement(element);
    _input.name = input.name;
    if (element === "input" && type) _input.setAttribute("type", type);

    if (element === "select") setupSelectInput(_input, input);

    const container = document.createElement("div");
    if (input.dependant_on) {
        container.style.display = "none";
        //add the atribute dependant_on to the input
        _input.setAttribute("data-dependant", input.dependant_on);

        container.setAttribute("data-dependant", input.dependant_on);
    }
    container.append(label, _input);
    return container;
};

//! first option is the html input, second is the json input data
const setupSelectInput = (_input, input) => {
    let options = input.options ?? [];
    if (input.options_url) {
        get_data_from_url(input.options_url).then(data => {
            options = [...options, ...data];
            populateSelectOptions(_input, options);
        });
    } else {
        populateSelectOptions(_input, options);
    }

    _input.addEventListener("change", () => toggleDependentFields(_input.value));
    setTimeout(() => _input.dispatchEvent(new Event("change")), 0);
};

const populateSelectOptions = (_input, options) => {
    options.forEach((option, index) => {
        const _option = document.createElement("option");
        _option.value = option;
        _option.textContent = option;
        if (index === 0) _option.selected = true;
        _input.appendChild(_option);
        //click the option to trigger the change event
        _input.click();
    });
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

    element = document.createElement("img");
    element.src = imageSrc;

    element.classList.add("gallery-image");
    element.addEventListener("click", () => {
        if (element.tagName === "IMG") {
            imgOrSvg.src = imageSrc;
        } else {
            imgOrSvg.innerHTML = `<use xlink:href="${imageSrc}"></use>`;
        }
        dialog.close();
    });

    return element;
}
async function buildButton(button_data, folder_name, folder_data, column, row) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")]
        .map(input => [input.name, input]))
    
    const replacePlaceholders = (str) => str.replace(/\{(.*?)\}/g, (_, v) => inputs[v]?.value || `{${v}}`);
    
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

    const replacePlaceholders = (str) => str.replace(/\{(.*?)\}/g, (_, v) => inputs[v]?.value || `{${v}}`);

    const obj = {
        column,
        row,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
    };
    
    // Check if any actions are configured
    let hasConfiguredAction = false;
    
    // Iterate over each action in button_data
    button_data.actions.forEach(action => {
        if (inputs[action].value === "None") {
            return;
        }
        
        hasConfiguredAction = true;
        
        let command = replacePlaceholders(inputs[action].value); // Replace placeholders
        console.log("command:", command);

        let variables = command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
        console.log("variables:", variables);

        let parent = inputs[action].parentElement;
        let inputs_container = parent.querySelector(".inputs_container");
        console.log(inputs_container);

        variables.forEach(variable => {
            let input = inputs_container.querySelector(`[name="${variable}"]`);
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

    // Handle file inputs if any
    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            const fileData = await handleFileUpload(input.files[0]);
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key].replace(new RegExp(`{${input.name}}`, 'g'), fileData?.file_path || "");
                }
            });
        }
    }));

    // Add the action object to folder_data
    folder_data.buttons.push(obj);

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
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

    // Crear opciones del select base
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

    // Inputs globales
    button_data.inputs
        .filter(input => input.shared === true)
        .forEach(input => {
            const [input_element, type] = input.TYPE.split(" ");
            const new_input = createElement(input_element);
            if (type) new_input.type = type;
            new_input.name = input.name;
            new_input.id = "global_" + input.name;
            global_inputs_container.appendChild(new_input);
        });

    // Contenedores de acciones
    const actions_fragment = document.createDocumentFragment();

    button_data.actions.forEach(action => {
        const action_container = createElement("div", "action-container");
        const label = createElement("label", "command-label", getTranslation("ACTION_NAME_" + action));
        const action_select = createElement("select", "command-select");
        action_select.name =action;
        action_select.appendChild(select_options.cloneNode(true));
        action_select.id = "command-select-" + action;
        action_select.addEventListener("change", (event) => update_inputs(event.target));

        // Contenedor de inputs de acción
        const inputs_container = createElement("div", "inputs_container");

        button_data.inputs
            .filter(input => input.shared !== true)
            .forEach(input => {

                const [input_element, type] = input.TYPE.split(" ");
                const new_input = createElement(input_element);

                let input_label = document.createElement("label");
                input_label.textContent = getTranslation(action+ "_" + input.name);
                input_label.htmlFor = input.name;
                input_label.style.display = "none"; 
                

                if (type) new_input.type = type;

                if (input_element === "select") {
                    input.options.forEach(option => {
                        const new_option = createElement("option", "", option);
                        new_option.value = option;
                        new_input.appendChild(new_option);
                    });
                }

                new_input.name = input.name;
                new_input.style.display = "none";                
                new_input.disabled = true;
                new_input.id = action + "_" + input.name;
                inputs_container.appendChild(input_label);
                inputs_container.appendChild(new_input);
            });

        action_container.append(label, action_select, inputs_container);
        actions_fragment.appendChild(action_container);
    });

    actions.appendChild(actions_fragment);
    actions.appendChild(global_inputs_container);

    return actions;
}
function update_inputs(event) {
    const parent = event.parentElement;
    const selected_option = event.options[event.selectedIndex];
    const variables = selected_option.value.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
    
    parent.querySelectorAll(':scope > .inputs_container > *').forEach(element => {
        if (element.tagName !== "OPTION") {
            const isLabel = element.tagName === "LABEL";
            const inputName = isLabel ? element.htmlFor : element.name;
            const shouldShow = variables.includes(inputName);
            
            element.style.display = shouldShow ? "block" : "none";
            element.disabled = !shouldShow;
            if (!shouldShow && element.tagName === "INPUT") element.value = "";
            if (element.tagName === "SELECT" && element.options.length > 0) {
                element.selectedIndex = 0;
            }
        }
    });
}