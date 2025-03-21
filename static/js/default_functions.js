function folder(PageName) {
    console.log("Loading page:", PageName);
    fetch(`/get_page/${PageName}`)
        .then(response => response.json())
        .then(data => {
            updateGrid(data);
            window.folder_data = data;
            window.folder_name = PageName;
        }
        )
        .catch(error => console.error("Error loading page:", error));
}

function fullscreen() {
    const isFullscreen = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    if (isFullscreen) {
        // Salir del modo pantalla completa
        document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
    } else {
        // Solicitar pantalla completa
        document.documentElement.requestFullscreen?.() || document.documentElement.mozRequestFullScreen?.() || document.documentElement.webkitRequestFullscreen?.() || document.documentElement.msRequestFullscreen?.();
    }
}

//function reload page
function reload() {
    window.location.reload();
}


async function uploadFolderData(folder_name, folder_data) {
    try {
        const response = await fetch(`/update_folder_data/${folder_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(folder_data),
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        return await response.json(); // Retorna el resultado de la respuesta
    } catch (error) {
        console.error("Error uploading folder data:", error);
        throw error; // Lanza el error para que lo maneje la función que lo llame
    }
}


function showCustomConfirm(message, callback) {
    // Crear el modal
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    // Crear el contenido del modal
    const content = document.createElement("div");
    content.style.backgroundColor = "white";
    content.style.padding = "20px";
    content.style.borderRadius = "8px";
    content.style.textAlign = "center";
    content.style.width = "300px";

    // Crear el mensaje
    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    content.appendChild(messageElement);

    // Crear los botones
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.marginTop = "20px";

    const acceptButton = document.createElement("button");
    acceptButton.textContent = "Aceptar";
    acceptButton.style.backgroundColor = "#007bff";
    acceptButton.style.color = "white";
    acceptButton.style.padding = "10px 20px";
    acceptButton.style.border = "none";
    acceptButton.style.borderRadius = "5px";
    acceptButton.style.cursor = "pointer";
    acceptButton.style.fontSize = "16px";
    acceptButton.style.marginRight = "10px";
    buttonsContainer.appendChild(acceptButton);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancelar";
    cancelButton.style.backgroundColor = "#ccc";
    cancelButton.style.color = "black";
    cancelButton.style.padding = "10px 20px";
    cancelButton.style.border = "none";
    cancelButton.style.borderRadius = "5px";
    cancelButton.style.cursor = "pointer";
    cancelButton.style.fontSize = "16px";
    buttonsContainer.appendChild(cancelButton);

    content.appendChild(buttonsContainer);
    modal.appendChild(content);

    // Añadir el modal al body
    document.body.appendChild(modal);

    // Acción al hacer clic en "Aceptar"
    acceptButton.onclick = () => {
        modal.remove();  // Eliminar el modal del DOM
        callback(true);   // Llamar al callback con true
    };

    // Acción al hacer clic en "Cancelar"
    cancelButton.onclick = () => {
        modal.remove();  // Eliminar el modal del DOM
        callback(false);  // Llamar al callback con false
    };
}