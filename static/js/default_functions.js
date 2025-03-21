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