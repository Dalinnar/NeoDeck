// image_gallery.js

function open_image_gallery(img) {
    let image_list = window.image_list;

    document.getElementById("image_dialog")?.remove();

    const dialog = createImageDialog();
    const gallery = dialog.querySelector("#image_gallery");

    const link_input = document.createElement("input");
    link_input.type = "text";
    link_input.placeholder = "Link de la imagen";
    link_input.addEventListener("input", (e) => {
        const link = e.target.value;
        if (link) {
            img.src = link;
            dialog.close();
        }
    });
    dialog.prepend(link_input);

    const input = createUploadInput(img, dialog, gallery);
    const uploadButton = createUploadButton(input);

    const no_image = document.createElement("div");
    no_image.classList.add("no-image");
    no_image.innerText = getTranslation("no_image_generic");
    no_image.onclick = () => {
        img.src = "/static/img/empty_img.png";
        dialog.close();
    };
    gallery.append(no_image);

    gallery.append(input, uploadButton);
    image_list.forEach(imageSrc => gallery.append(createGalleryImage(imageSrc, img, dialog)));

    const closeButton = document.createElement("button");
    closeButton.innerText = "Cerrar";
    closeButton.classList.add("close-button");
    closeButton.addEventListener("click", () => dialog.close());
    dialog.append(closeButton);

    document.body.appendChild(dialog);
    dialog.showModal();
}

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

function createUploadInput(imgOrSvg, dialog, gallery) {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    input.accept = "image/*";

    input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let data = await handleFileUpload(file);
        if (!data) {
            console.error("Invalid data received from file upload");
            return;
        }

        const previewImg = createGalleryImage(data, imgOrSvg, dialog);
        if (!window.image_list) window.image_list = [];
        window.image_list.push(data);
        gallery.insertBefore(previewImg, gallery.children[3]);
    });

    return input;
}

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
        if (!data.success) throw new Error(data.message || "Upload failed");
        return data;
    } catch (error) {
        console.error("Error en la subida:", error);
        return null;
    }
}

function createGalleryImage(imageSrc, imgOrSvg, dialog) {
    if (!imageSrc) {
        console.error("Invalid image source provided to createGalleryImage");
        return document.createElement("div");
    }

    let div = document.createElement("div");
    div.style.position = "relative";
    div.classList.add("gallery-image-container");

    const element = document.createElement("img");
    element.src = imageSrc;

    if (typeof imageSrc === 'string' && imageSrc.includes("user_uploads")) {
        let deleteButton = document.createElement("div");
        deleteButton.classList.add("delete-button");
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="red">
                <path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.89 4.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/>
            </svg>`;
        deleteButton.style.position = "absolute";
        deleteButton.style.top = "5%";
        deleteButton.style.right = "5%";
        deleteButton.style.cursor = "pointer";

        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            if (confirm(getTranslation("confirm_delete_image"))) {
                if (window.image_list) {
                    window.image_list = window.image_list.filter(image => image !== imageSrc);
                }
                div.remove();
                fetch("/delete_file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file_path: imageSrc })
                })
                    .then(response => {
                        if (response.ok) console.log("Archivo eliminado exitosamente");
                        else console.error("Error al eliminar el archivo");
                    })
                    .catch(error => console.error("Error al eliminar el archivo:", error));
            }
        });

        div.appendChild(deleteButton);
    }

    element.classList.add("gallery-image");
    div.addEventListener("click", () => {
        if (element.tagName === "IMG") imgOrSvg.src = imageSrc;
        else imgOrSvg.innerHTML = `<use xlink:href="${imageSrc}"></use>`;
        dialog.close();
    });
    div.appendChild(element);
    return div;
}