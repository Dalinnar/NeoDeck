// Declara la variable global para almacenar los datos de la carpeta
let currentFolderData = {};

// Script to load all folders on pages-container
const page_container = document.getElementById("pages-container");
let pages = window.pages;

pages.forEach((page) => {
    const page_div = document.createElement("div");
    page_div.classList.add("page");
    page_div.id = "page-" + page;

    page_div.addEventListener("click", () => {
        folder(page);
    });

    const title = document.createElement("p");
    title.innerText = page;

    // SVG Icon with click event to toggle folder config
    const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" class="chevron_svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" stroke-width="1">
      <path d="M6 9l6 6l6 -6"></path>
    </svg>
  `;

    page_div.innerHTML = `${title.outerHTML}${svgIcon}`;

    const svg = page_div.querySelector("svg");

    svg.addEventListener("click", (e) => {
        // Prevent event propagation to avoid triggering page click event
        e.stopPropagation();

        // Call folder_config when SVG icon is clicked
        get_folder_data(page);
    });


    page_container.appendChild(page_div);
});

//button to add a folder
const add_bttn = document.createElement("div");
add_bttn.innerHTML = "+"
add_bttn.classList.add("page");
add_bttn.id = "add_bttn";

add_bttn.addEventListener("click", add_folder);

page_container.appendChild(add_bttn);


function get_folder_data(page) {
    fetch(`folder_data/${page}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success === false) {
                console.error("Error:", data.message);
                return;
            }

            currentFolderData = data.folder; // Asigna los datos de la carpeta a la variable global
            const pageDiv = document.getElementById(`page-${page}`);

            // Cerrar cualquier otro menú abierto antes de abrir uno nuevo
            document.querySelectorAll(".folder-config").forEach(menu => menu.remove());

            // Verificar si ya existe el contenedor de configuración y eliminarlo
            let existingConfig = pageDiv.querySelector(".folder-config");
            if (existingConfig) {
                existingConfig.remove();
                return;
            }

            // Crear nuevo div de configuración
            const configDiv = document.createElement("div");
            configDiv.classList.add("folder-config");
            configDiv.onclick = (event) => event.stopPropagation(); // Evitar que se cierre al hacer clic dentro


            //creat el div svg para eliminar el folder
            const remove_cont = document.createElement("div");
            remove_cont.classList.add("remove_cont");
            remove_cont.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" stroke-width="1"> 
                    <path d="M4 7l16 0"></path> 
                    <path d="M10 11l0 6"></path> 
                    <path d="M14 11l0 6"></path> 
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path> 
                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
                </svg>
            `;

            const svgElement = remove_cont.querySelector("svg");

            svgElement.addEventListener("click", () => {
                if (confirm("Are you sure you want to delete this folder?")) {
                    console.log("deleting folder");
                    console.log(page)
                    deletefolder(page)
                }
            });



            // Crear y agregar el campo de Background
            const bgLabel = document.createElement("label");
            bgLabel.textContent = "Background: ";
            const bgInput = document.createElement("input");
            bgInput.type = "color";
            bgInput.style.width = "-webkit-fill-available";
            bgInput.id = `background-${page}`;
            bgInput.value = currentFolderData.background || "#3f3f3f";
            bgLabel.appendChild(bgInput);

            // background image and preview
            const bgimglabel = document.createElement("label");
            bgimglabel.textContent = "Background Image: ";

            const bgimginput = document.createElement("input");
            bgimginput.type = "file";
            bgimginput.accept = "image/*"; // Solo permite imágenes
            bgimginput.style.display = "none";
            bgimginput.name = `bg-image-${page}`; // Asigna un nombre único
            bgimginput.id = `bg-image-${page}`; // Asigna un ID único

            const bgPreview = document.createElement("div");
            bgPreview.classList.add("bg-preview");
            bgPreview.id = `bg-preview-${page}`;

            // Establece el fondo inicial
            if (currentFolderData.background_img) {
                bgPreview.style.backgroundImage = `url(${currentFolderData.background_img})`;
                bgPreview.style.backgroundColor = "transparent";
            } else {
                bgPreview.style.backgroundImage = "none";
                bgPreview.style.backgroundColor = "#429c51"; // Color de fondo si no hay imagen
            }

            // Agrega el input dentro del div
            bgPreview.appendChild(bgimginput);

            // Evento para abrir el input al hacer clic en el div
            bgPreview.addEventListener("click", () => {
                bgimginput.click();
            });

            // Evento para cambiar la vista previa cuando se selecciona una imagen
            bgimginput.addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        bgPreview.style.backgroundImage = `url(${e.target.result})`;
                        bgPreview.style.backgroundColor = "transparent"; // Oculta el color de fondo
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Crear y agregar el campo de Columns
            const colLabel = document.createElement("label");
            colLabel.textContent = "Columns: ";
            const colInput = document.createElement("input");
            colInput.type = "number";
            colInput.id = `columns-${page}`;
            colInput.value = currentFolderData.columns || 8;
            colLabel.appendChild(colInput);

            // Crear y agregar el campo de Rows
            const rowLabel = document.createElement("label");
            rowLabel.textContent = "Rows: ";
            const rowInput = document.createElement("input");
            rowInput.type = "number";
            rowInput.id = `rows-${page}`;
            rowInput.value = currentFolderData.rows || 3;
            rowLabel.appendChild(rowInput);

            // Crear y agregar el botón de guardar
            const saveButton = document.createElement("button");
            saveButton.textContent = "Guardar";
            saveButton.onclick = () => update_folder_data(page);

            // Agregar elementos al div de configuración
            configDiv.appendChild(remove_cont);
            configDiv.appendChild(bgLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(bgimglabel);
            configDiv.appendChild(bgPreview);
            configDiv.appendChild(colLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(rowLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(saveButton);

            // Agregar el div de configuración al contenedor principal
            pageDiv.appendChild(configDiv);

            // Agregar evento para cerrar menú si se hace clic fuera
            document.addEventListener("click", function closeMenu(event) {
                if (!configDiv.contains(event.target)) {
                    configDiv.remove();
                    document.removeEventListener("click", closeMenu);
                }
            });
        })
        .catch(error => {
            console.error("Fetch error:", error);
        });
}

function update_folder_data(page) {
    let input = document.getElementById(`bg-image-${page}`).files[0];

    const background = document.getElementById(`background-${page}`).value;
    const columns = document.getElementById(`columns-${page}`).value;
    const rows = document.getElementById(`rows-${page}`).value;

    currentFolderData.background = background;
    currentFolderData.columns = parseInt(columns, 10);
    currentFolderData.rows = parseInt(rows, 10);

    let uploadPromise = Promise.resolve(); // Si no hay archivo, esta promesa se resuelve inmediatamente

    if (input) {
        let formData = new FormData();
        formData.append("file", input);
        formData.append("info", "background_image");

        uploadPromise = fetch("/upload_file", {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('File uploaded successfully:', data.file_path);
                    data.file_path = data.file_path.replace(/\\/g, "/");
                    currentFolderData.background_img = data.file_path;
                } else {
                    console.error('Error uploading file:', data.message);
                }
            })
            .catch(error => {
                console.error('Error during fetch:', error);
            });
    }

    // Esperar a que termine la subida del archivo antes de actualizar los datos
    uploadPromise.then(() => {
        fetch(`update_folder_data/${page}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentFolderData),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("Datos actualizados correctamente.");
                    folder(page);
                } else {
                    console.error("Error al actualizar:", data.message);
                }
            })
            .catch(error => console.error("Fetch error:", error));
    });

}


function add_folder() {
    const add_bttn = document.getElementById("add_bttn");

    // Cerrar cualquier otro menú abierto antes de abrir uno nuevo
    document.querySelectorAll(".folder-config").forEach(menu => menu.remove());

    // Crear nuevo div de configuración
    const configDiv = document.createElement("div");
    configDiv.classList.add("folder-config");

    configDiv.onclick = (event) => event.stopPropagation(); // Evitar que se cierre al hacer clic dentro

    // Obtener la posición del botón
    const rect = add_bttn.getBoundingClientRect();
    configDiv.style.top = `${rect.bottom + window.scrollY}px`;
    configDiv.style.left = `${rect.left + window.scrollX}px`;

    // Crear y agregar el campo de Title
    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Title: ";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = "folder-title";
    titleLabel.appendChild(titleInput);

    // Crear y agregar el campo de Background
    const bgLabel = document.createElement("label");
    bgLabel.textContent = "Background: ";
    const bgInput = document.createElement("input");
    bgInput.style.width = "-webkit-fill-available"
    bgInput.type = "color";
    bgInput.id = "folder-background";
    bgInput.value = "#3f3f3f";
    bgLabel.appendChild(bgInput);

    // Background image and preview
    const bgimglabel = document.createElement("label");
    bgimglabel.textContent = "Background Image: ";

    const bgimginput = document.createElement("input");
    bgimginput.type = "file";
    bgimginput.accept = "image/*";
    bgimginput.style.display = "none";
    bgimginput.id = "folder-bg-image";



    const bgPreview = document.createElement("div");
    bgPreview.classList.add("bg-preview");
    bgPreview.id = "folder-bg-preview";
    bgPreview.style.backgroundColor = "#429c51";

    bgPreview.appendChild(bgimginput);


    bgPreview.addEventListener("click", () => {
        bgimginput.click();
    });

    bgimginput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                bgPreview.style.backgroundImage = `url(${e.target.result})`;
                bgPreview.style.backgroundColor = "transparent";
            };
            reader.readAsDataURL(file);
        }
    });

    // Crear y agregar el campo de Columns
    const colLabel = document.createElement("label");
    colLabel.textContent = "Columns: ";
    const colInput = document.createElement("input");
    colInput.type = "number";
    colInput.id = "folder-columns";
    colInput.value = 8;
    colLabel.appendChild(colInput);

    // Crear y agregar el campo de Rows
    const rowLabel = document.createElement("label");
    rowLabel.textContent = "Rows: ";
    const rowInput = document.createElement("input");
    rowInput.type = "number";
    rowInput.id = "folder-rows";
    rowInput.value = 3;
    rowLabel.appendChild(rowInput);

    // Crear y agregar el botón de guardar
    const saveButton = document.createElement("button");
    saveButton.textContent = "Guardar";
    saveButton.onclick = () => save_new_folder();

    // Agregar elementos al div de configuración
    configDiv.appendChild(titleLabel);
    configDiv.appendChild(document.createElement("br"));
    configDiv.appendChild(bgLabel);
    configDiv.appendChild(document.createElement("br"));
    configDiv.appendChild(bgimglabel);
    configDiv.appendChild(bgPreview);
    configDiv.appendChild(colLabel);
    configDiv.appendChild(document.createElement("br"));
    configDiv.appendChild(rowLabel);
    configDiv.appendChild(document.createElement("br"));
    configDiv.appendChild(saveButton);

    // Agregar el div de configuración al body
    document.body.appendChild(configDiv);

    // Agregar evento para cerrar menú si se hace clic fuera
    document.addEventListener("click", function closeMenu(event) {
        if (!configDiv.contains(event.target) && event.target !== add_bttn) {
            configDiv.remove();
            document.removeEventListener("click", closeMenu);
        }
    });
}

function save_new_folder() {
    const input = document.getElementById("folder-bg-image").files[0];
    const title = document.getElementById("folder-title").value;
    console.log(title);
    const background = document.getElementById("folder-background").value; // Ahora será un color
    const columns = document.getElementById("folder-columns").value;
    const rows = document.getElementById("folder-rows").value;

    let formData = new FormData();
    let obj = {
        [title]: {
            "background": background,
            "columns": columns,
            "rows": rows,
            "buttons": []
        }
    };

    // Agregar el archivo al FormData si existe
    if (input) {
        formData.append("file", input);
        formData.append("info", "background_image");
    }

    // Función para enviar el archivo si existe
    const uploadFile = () => {
        if (input) {
            return fetch("/upload_file", {
                method: 'POST',
                body: formData,  // Enviar el FormData con el archivo
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('File uploaded successfully:', data.file_path);
                        //normalize the file path
                        data.file_path = data.file_path.replace(/\\/g, "/");
                        return data.file_path;
                    } else {
                        console.error('Error uploading file:', data.message);

                        return null;
                    }
                });
        } else {
            return Promise.resolve(null);
        }
    };

    // Llamada a la API para crear la carpeta
    uploadFile()
        .then(file_path => {
            if (file_path) {
                obj["background_img"] = file_path; // Agregar la ruta de la imagen si se subió
            }

            console.log(obj);

            return fetch("/create_folder", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(obj)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Folder created successfully:', data.folder_id);
            } else {
                console.error('Error creating folder:', data.message);
                alert(data.message)
            }
        })
        .catch(error => {
            console.error('Error during fetch:', error);

        });
    //reload the page
    location.reload();
}

function deletefolder(page) {
    // Fetch delete folder
    console.log("deleting: ", page);
    fetch(`/delete_folder/${page}`, {
        method: 'DELETE',
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert(`Error: ${data.message}`);  // Mostrar un alert si success es false
            } else {
                alert('Folder deleted successfully');
                location.reload(); 
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the folder.');
        });
}