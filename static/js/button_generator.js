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

    button_data.inputs.forEach(input => dialog_content.appendChild(createInputField(input)));

    // Crear contenedor del botón
    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    // Crear controles de personalización
    const { colorLabel, colorInput, sizeSlider } = createCustomizationControls(button_template);
    dialog_content.append(colorLabel, colorInput, sizeSlider);

    // Botón de enviar
    const submit_button = document.createElement("button");
    submit_button.textContent = "Submit";
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
    });
};

const toggleDependentFields = (selectedValue) => {
    document.querySelectorAll("[data-dependant]").forEach(dep => dep.style.display = "none");
    document.querySelectorAll(`[data-dependant="${selectedValue}"]`).forEach(dep => dep.style.display = "flex");
};

const createButtonTemplate = (button_data) => {
    const button_template = document.createElement("div");
    button_template.classList.add("button_template");
    button_template.style.backgroundColor = "#393939";

    const img = document.createElement("img");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const imageSource = button_data && button_data.style && button_data.style.image ? button_data.style.image : "key.png";
    if (imageSource.endsWith(".svg")) {
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML = `<use xlink:href="${imageSource}"></use>`;
        svg.style.width = "80%";
        svg.style.height = "auto";
        svg.addEventListener("click", () => open_image_gallery(svg));
        button_template.appendChild(svg);
    } else {
        img.src = `/static/img/${imageSource}`;
        img.style.width = "80%";
        img.style.height = "auto";
        img.addEventListener("click", () => open_image_gallery(img));
        button_template.appendChild(img);
    }
    
    return button_template;
};

const createCustomizationControls = (button_template) => {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.id = "button_color_input";
    colorInput.addEventListener("input", (e) => button_template.style.backgroundColor = e.target.value);

    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Color:";
    colorLabel.htmlFor = colorInput.id;

    const sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.min = "0";
    sizeSlider.max = "100";
    sizeSlider.value = "80";
    sizeSlider.addEventListener("input", (e) => {
        const imgOrSvg = button_template.querySelector("img") || button_template.querySelector("svg");
        imgOrSvg.style.width = e.target.value + "%";
    });

    return { colorLabel, colorInput, sizeSlider };
};

function get_data_from_url(url) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return data;
        })
        .catch(error => console.error(error));
}

function open_image_gallery(imgOrSvg) {
    let image_list = window.image_list;

    // Si el diálogo ya existe, eliminarlo
    document.getElementById("image_dialog")?.remove();

    // Crear y mostrar el diálogo
    const dialog = createImageDialog();
    const gallery = dialog.querySelector("#image_gallery");

    // Crear input de subida y botón de carga
    const input = createUploadInput(imgOrSvg, dialog, gallery);
    const uploadButton = createUploadButton(input);

    // Agregar el botón de subida a la galería
    gallery.append(input, uploadButton);

    // Agregar imágenes existentes a la galería
    image_list.forEach(imageSrc => gallery.append(createGalleryImage(imageSrc, imgOrSvg, dialog)));

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

        const previewImg = createGalleryImage(URL.createObjectURL(file), imgOrSvg, dialog);

        // Subir imagen al servidor y actualizar src
        await handleFileUpload(file, previewImg, gallery);

        gallery.appendChild(previewImg);
    });

    return input;
}

// Crear botón para subir imágenes
function createUploadButton(input) {
    const upload_div = document.createElement("div");
    upload_div.classList.add("upload-button");
    upload_div.innerText = "Subir imagen";
    upload_div.addEventListener("click", () => input.click());
    return upload_div;
}

// Manejar la subida del archivo
async function handleFileUpload(file, previewImg, gallery) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload_file", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            previewImg.src = data.file_path; // Reemplazar imagen con la URL real
            window.image_list.push(data.file_path);
        } else {
            console.error("Error al subir archivo:", data.message);
        }
    } catch (error) {
        console.error("Error en la subida:", error);
    }
}

// Crear una imagen en la galería
function createGalleryImage(imageSrc, imgOrSvg, dialog) {
    let element;

    if (imageSrc.endsWith(".svg")) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        element.setAttribute("viewBox", "0 0 24 24");
        element.innerHTML = `<use xlink:href="${imageSrc}"></use>`;
    } else {
        element = document.createElement("img");
        element.src = imageSrc;
    }

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