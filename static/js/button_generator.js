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

//function to gle fields based on selected value and remove the con
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


    
    


    text_div = document.createElement("div");
    text_div.classList.add("button_text_div");

    button_text = document.createElement("h3");
    button_text.textContent = "";
    button_text.id = "button_text";

    text_div.appendChild(button_text);



    button_template.appendChild(text_div);
    if (button_data.command === "#monitor") {
        Initialize_monitors();
        h2 = document.createElement("h2");
        h2.setAttribute("data_from", button_data.collect_data_from ?? "");

        text_div.appendChild(h2);
    }



    const img = document.createElement("img");
    imageSource = button_data.style?.image ?? "empty_img.png";
    imageSource = imageSource || "empty_img.png";  // Si es una cadena vacía, usa "empty_img.png"
    img.src = imageSource.includes("/") ? imageSource : `/static/img/${imageSource}`;

    img.style.width = "80%";
    img.style.height = "auto";
    button_template.appendChild(img);


    button_template.addEventListener("click", () => open_image_gallery(img));


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

    upload_div.innerText = getTranslation("upload_image_generic");
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