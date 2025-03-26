function multiselect(id) {
    // Graba el elemento select
    const element = document.getElementById(id);
    element.style.display = "none";

    
    //check if selectmenu already exist, if exist remove it
    const selectmenu = document.getElementById("selectmenu");
    if (selectmenu) {
        selectmenu.remove();
    }
    // Agregar el contenedor selector
    const parent = element.parentElement;
    const selector_container = document.createElement("div");
    selector_container.id = "selectmenu";

    // Crear divs de opciones seleccionadas y el botón para mostrar opciones
    const selectedOptions = document.createElement("div");
    const inputContainer = document.createElement("div");
    const input = document.createElement("input");
    const addButton = document.createElement("button");

    // Establecer las clases
    selectedOptions.classList.add("selected_options");
    inputContainer.classList.add("input-container");

    addButton.textContent = "Add Option"; // Texto del botón
    addButton.type = "button"; // No es un submit
    addButton.classList.add("add-btn");

    // Definir la acción del botón
    addButton.addEventListener("click", () => {
        const newOptionText = input.value.trim();
        if (newOptionText !== "") {
            // Crear la nueva opción
            const newOption = document.createElement("option");
            newOption.textContent = newOptionText;
            newOption.value = newOptionText.toLowerCase().replace(/\s+/g, "_");

            // Agregar la opción al select
            element.appendChild(newOption);

            // Seleccionar la nueva opción
            newOption.selected = true;

            // Limpiar el campo de texto
            input.value = "";

            // Actualizar la vista de opciones seleccionadas
            const optionDiv = createOptionDiv(newOptionText, newOption);
            selectedOptions.appendChild(optionDiv);
            markChanged()
        }
    });

    // Función para crear las opciones con la "X" para eliminarlas
    function createOptionDiv(optionText, optionElement) {
        const optionDiv = document.createElement("div");
        optionDiv.textContent = optionText;
        optionDiv.classList.add("option-item");

        const removeBtn = document.createElement("span");
        removeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" stroke-width="1"> <path d="M18 6l-12 12"></path> <path d="M6 6l12 12"></path> </svg> `;
        

        removeBtn.classList.add("remove-option");

        // Eliminar opción al hacer clic en la "X"
        removeBtn.addEventListener("click", () => {
            // Eliminar la opción del select
            element.removeChild(optionElement);
            markChanged();

            // Eliminar la opción visualmente
            selectedOptions.removeChild(optionDiv);
        });

        // Añadir la "X" al lado del texto
        optionDiv.appendChild(removeBtn);
        return optionDiv;
    }

    // Crear el input para agregar nuevas opciones
    inputContainer.appendChild(input);
    inputContainer.appendChild(addButton);

    // Agregar los elementos al contenedor principal
    selector_container.appendChild(selectedOptions);
    selector_container.appendChild(inputContainer);

    // Agregar todas las opciones existentes
    for (let i = 0; i < element.options.length; i++) {
        const option = element.options[i];
        const optionDiv = createOptionDiv(option.text, option);
        selectedOptions.appendChild(optionDiv);
    }

    // Añadir el contenedor selector al elemento padre
    parent.appendChild(selector_container);
}
