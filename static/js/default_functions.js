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