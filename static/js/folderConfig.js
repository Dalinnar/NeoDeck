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

            currentFolderData = data.folder;
            const pageDiv = document.getElementById(`page-${page}`);

            document.querySelectorAll(".folder-config").forEach(menu => menu.remove());

            let existingConfig = pageDiv.querySelector(".folder-config");
            if (existingConfig) {
                existingConfig.remove();
                return;
            }

            const configDiv = document.createElement("div");
            configDiv.classList.add("folder-config");
            configDiv.onclick = (event) => event.stopPropagation();

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
            remove_cont.querySelector("svg").addEventListener("click", () => {
                if (confirm(getTranslation("delete_folder_confirm"))) {
                    deletefolder(page);
                }
            });

            const bgLabel = document.createElement("label");
            bgLabel.textContent = getTranslation("background");
            
            const bgInput = document.createElement("input");
            bgInput.type = "color";
            bgInput.style.width = "-webkit-fill-available";
            bgInput.id = `background-${page}`;
            bgInput.value = currentFolderData.background || "#3f3f3f";
            bgLabel.appendChild(bgInput);

            const bgimglabel = document.createElement("label");
            bgimglabel.textContent = getTranslation("background_image");
            
            const bgimginput = document.createElement("input");
            bgimginput.type = "file";
            bgimginput.accept = "image/*";
            bgimginput.style.display = "none";
            bgimginput.name = `bg-image-${page}`;
            bgimginput.id = `bg-image-${page}`;

            const bgPreview = document.createElement("div");
            bgPreview.classList.add("bg-preview");
            bgPreview.id = `bg-preview-${page}`;

            if (currentFolderData.background_img) {
                bgPreview.style.backgroundImage = `url(${currentFolderData.background_img})`;
                bgPreview.style.backgroundColor = "transparent";
            } else {
                bgPreview.style.backgroundImage = "none";
                bgPreview.style.backgroundColor = "#429c51";
            }

            bgPreview.appendChild(bgimginput);
            bgPreview.addEventListener("click", () => bgimginput.click());

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

            const removeBgBtn = document.createElement("button");
            removeBgBtn.textContent = getTranslation("remove_image");
            removeBgBtn.style.display = currentFolderData.background_img ? "block" : "none";
            removeBgBtn.addEventListener("click", () => {
                bgPreview.style.backgroundImage = "none";
                bgPreview.style.backgroundColor = "#429c51";
                currentFolderData.background_img = "remove_image";
                removeBgBtn.style.display = "none";
            });

            const colLabel = document.createElement("label");
            colLabel.textContent = getTranslation("columns");
            const colInput = document.createElement("input");
            colInput.type = "number";
            colInput.id = `columns-${page}`;
            colInput.value = currentFolderData.columns || 8;
            colLabel.appendChild(colInput);

            const rowLabel = document.createElement("label");
            rowLabel.textContent = getTranslation("rows");
            const rowInput = document.createElement("input");
            rowInput.type = "number";
            rowInput.id = `rows-${page}`;
            rowInput.value = currentFolderData.rows || 3;
            rowLabel.appendChild(rowInput);

            const saveButton = document.createElement("button");
            saveButton.textContent = getTranslation("save");
            saveButton.onclick = () => update_folder_data(page);

            configDiv.appendChild(remove_cont);
            configDiv.appendChild(bgLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(bgimglabel);
            configDiv.appendChild(bgPreview);
            configDiv.appendChild(removeBgBtn);
            configDiv.appendChild(colLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(rowLabel);
            configDiv.appendChild(document.createElement("br"));
            configDiv.appendChild(saveButton);

            pageDiv.appendChild(configDiv);

            document.addEventListener("click", function closeMenu(event) {
                if (!configDiv.contains(event.target)) {
                    configDiv.remove();
                    document.removeEventListener("click", closeMenu);
                }
            });
        })
        .catch(error => console.error("Fetch error:", error));
}

function update_folder_data(page) {
    let input = document.getElementById(`bg-image-${page}`).files[0];

    const background = document.getElementById(`background-${page}`).value;
    const columns = document.getElementById(`columns-${page}`).value;
    const rows = document.getElementById(`rows-${page}`).value;

    currentFolderData.background = background;
    currentFolderData.columns = parseInt(columns, 10);
    currentFolderData.rows = parseInt(rows, 10);

    let uploadPromise = Promise.resolve();

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
                currentFolderData.background_img = data.file_path.replace(/\\/g, "/");
            }
        });
    } else if (currentFolderData.background_img === "remove_image") {
        currentFolderData.background_img = "remove_image";
    }

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
            }
        });
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
    titleLabel.textContent = getTranslation("title");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = "folder-title";
    titleLabel.appendChild(titleInput);

    // Crear y agregar el campo de Background
    const bgLabel = document.createElement("label");
    bgLabel.textContent = getTranslation("background");
    const bgInput = document.createElement("input");
    bgInput.style.width = "-webkit-fill-available"
    bgInput.type = "color";
    bgInput.id = "folder-background";
    bgInput.value = "#3f3f3f";
    bgLabel.appendChild(bgInput);

    // Background image and preview
    const bgimglabel = document.createElement("label");
    bgimglabel.textContent = getTranslation("background_image");

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
    colLabel.textContent = getTranslation("columns");
    const colInput = document.createElement("input");
    colInput.type = "number";
    colInput.id = "folder-columns";
    colInput.value = 8;
    colLabel.appendChild(colInput);

    // Crear y agregar el campo de Rows
    const rowLabel = document.createElement("label");
    rowLabel.textContent = getTranslation("rows");
    const rowInput = document.createElement("input");
    rowInput.type = "number";
    rowInput.id = "folder-rows";
    rowInput.value = 3;
    rowLabel.appendChild(rowInput);

    // Crear y agregar el botón de guardar
    const saveButton = document.createElement("button");
    saveButton.textContent = getTranslation("save");
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
    // Get form elements
    const inputFile = document.getElementById("folder-bg-image").files[0];
    const title = document.getElementById("folder-title").value.trim();
    const background = document.getElementById("folder-background").value;
    const columns = document.getElementById("folder-columns").value;
    const rows = document.getElementById("folder-rows").value;
    
    // Validate input
    if (!validateInput(title)) return;
    
    // Prepare folder data
    const folderData = {
      [title]: {
        background,
        columns,
        rows,
        buttons: []
      }
    };
    
    // Handle file upload and folder creation
    handleFileUpload(inputFile)
      .then(filePath => {
        if (filePath) {
          folderData[title].background_img = filePath;
        }
        return createFolder(folderData);
      })
      .then(result => {
        if (result.success) {
          console.log('Folder created successfully:', result.folder_id);
          location.reload();
        } else {
          handleError('Error creating folder:', result.message);
        }
      })
      .catch(error => handleError('Error during operation:', error));
  }
  
  // Validation function
  function validateInput(title) {
    if (!title) {
      alert("Title cannot be empty");
      return false;
    }
    
    if (window.pages.includes(title)) {
      alert("Title already exists");
      return false;
    }
    
    return true;
  }
  
  // Handle file upload
  function handleFileUpload(file) {
    if (!file) return Promise.resolve(null);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("info", "background_image");
    
    return fetch("/upload_file", {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('File uploaded successfully:', data.file_path);
          return data.file_path.replace(/\\/g, "/"); // Normalize path
        } 
        throw new Error(data.message || 'Unknown error during file upload');
      });
  }
  
  // Create folder via API
  function createFolder(folderData) {
    return fetch("/create_folder", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folderData)
    })
      .then(response => response.json());
  }
  
  // Error handler
  function handleError(message, error) {
    console.error(message, error);
    if (typeof error === 'string') {
      alert(error);
    } else if (error?.message) {
      alert(error.message);
    }
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