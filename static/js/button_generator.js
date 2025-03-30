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

    button_data.inputs.forEach(input => dialog_content.appendChild(createInputField(input)));

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
        buildButton(button_data, folder_name, folder_data, column, row)
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

    // if the command is "#monitor", initialize monitors
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
    if (button_data.command.startsWith("!")) {
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
    const inputs = [...dialog.querySelectorAll("[name]:not([disabled])")];

    const obj = { command: button_data.command, column: column, row: row };

    try {
        await Promise.all(inputs.map(async (input) => {
            const value = input.type === "file" && input.files.length > 0
                ? await handleFileUpload(input.files[0]).then(fileData => fileData?.file_path)
                : input.value;

            if (value) {
                obj.command = obj.command.replace(new RegExp(`{${input.name}}`, 'g'), value);
            }
        }));

        // setup the colors
        obj.background_color = inputs.find(input => input.name === "background_color")?.value || "#1e1e1e";
        obj.text_color = inputs.find(input => input.name === "text_color")?.value || "#ffffff";

        obj.command = obj.command.replace(/\{(.*?)\}/g, (_, v) =>
            inputs.find(i => i.name === v)?.value || `{${v}}`
        );
        const image_element = document.querySelector(".button_image").src.replace(/^([^\/]*\/[^\/]*\/[^\/]*)(.*)$/, '$2');
        if (image_element !== "/static/img/empty_img.png") {
            obj.image = image_element;
            obj.image_size = inputs.find(input => input.name === "img_size")?.value || "80";
        }

        const buttonTextInput = inputs.find(input => input.name === "button_text");
        if (buttonTextInput?.value) obj.btn_text = buttonTextInput.value;

        if (button_data.command === "#monitor") {
            obj.track = button_data.track;
            obj.collect_data_from = button_data.collect_data_from.replace(/\{(.*?)\}/g, (_, v) =>
                inputs.find(i => i.name === v)?.value || `{${v}}`
            );
        }
        if (button_data.command.startsWith("!")) {
            obj.min = button_data.min;
            obj.max = button_data.max;
        }
        folder_data.buttons.push(obj);

        // Llamar a la nueva función para subir los datos
        const result = await uploadFolderData(folder_name, folder_data);

        updateGrid(result.folder);

    } catch (error) {
        console.error("Error processing inputs:", error);
    }
}

