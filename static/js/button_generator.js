// button_generator.js

document.addEventListener("DOMContentLoaded", () => {
    const main_container = document.querySelector(".main-container");
    main_container.innerHTML += `
        <dialog id="button_creator_dialog" class="button_creator_container">
            <svg xmlns="http://www.w3.org/2000/svg" onclick="button_creator_dialog.close(); window.dialogopen = false;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" stroke-width="1">
                <path d="M18 6l-12 12"></path>
                <path d="M6 6l12 12"></path>
            </svg>
            <div class="dialog_content"></div>
        </dialog>
    `;
});

const setup_multiaction = (button_data, folder_name, folder_data, column, row, constructor_id) => {
    const dialog = document.getElementById("button_creator_dialog");
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    const localButtonData = structuredClone(window.buttonData || {});

    const dropzone = document.createElement("DIV");
    dropzone.classList.add("multiaction_dropzone");

    // Add the label
    const dropLabel = document.createElement("H2");
    dropLabel.textContent = "Drop the buttons here";
    dropLabel.classList.add("multiaction_dropzone__label");
    dropzone.appendChild(dropLabel);

    dropzone.addEventListener("dragover", (e) => e.preventDefault());

    const dragHandlers = createDragHandlers(dropzone);
    dropzone.addEventListener("drop", handleDrop);
    dialog_content.appendChild(dropzone);

    function handleDrop(e) {
        e.preventDefault();
        if (e.dataTransfer.types.includes("application/x-reorder")) return;

        const id = e.dataTransfer.getData("text/plain");
        const buttonData = localButtonData?.[id];
        if (!buttonData) return;

        const container = buildMultiactionButtonContainer(id, buttonData, localButtonData, dragHandlers);
        dropzone.appendChild(container);
        dropLabel.style.display = "none";
    }

    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        if (attributes.text) el.textContent = attributes.text;
        return el;
    };

    const personalization_div = createElement("div", ["personalization_settings"]);
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);
    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = createElement("button", ["submit_button"], { text: "Submit" });
    submit_button.addEventListener("click", () => {
        buildMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id);
        dialog.close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);
};

const generate_button = (button_data, folder_name, folder_data, column, row, constructor_id = null) => {
    const modal = document.getElementById("button_creator_dialog");

    if (button_data.command == "__multiaction__") {
        modal.show();
        window.dialogopen = true;
        setup_multiaction(button_data, folder_name, folder_data, column, row, constructor_id);
        return;
    }

    modal.showModal();
    window.dialogopen = true;
    const dialog_content = document.querySelector(".dialog_content");
    dialog_content.innerHTML = "";

    const text_generic = document.createElement("input");
    text_generic.name = "button_text";
    text_generic.setAttribute("type", "text");
    text_generic.setAttribute("placeholder", "Button Text");
    text_generic.addEventListener("input", () => {
        const button_text = document.getElementById("button_text");
        button_text.textContent = text_generic.value;
    });
    dialog_content.appendChild(text_generic);

    if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
        dialog_content.appendChild(setup_actions(button_data));
    } else {
        button_data.inputs?.forEach(input => dialog_content.appendChild(createInputField(input)));
    }

    const button_template = createButtonTemplate(button_data);
    dialog_content.appendChild(button_template);

    const personalization_div = document.createElement("div");
    personalization_div.classList.add("personalization_settings");
    const { colorLabel, colorInput, text_color_input, sizeSlider } = createCustomizationControls(button_template);
    personalization_div.append(colorLabel, colorInput, text_color_input);
    dialog_content.appendChild(personalization_div);
    dialog_content.appendChild(sizeSlider);

    const submit_button = document.createElement("button");
    submit_button.textContent = "Submit";
    submit_button.classList.add("submit_button");
    submit_button.addEventListener("click", function () {
        if (button_data.commands && typeof button_data.commands === "object" && !button_data.command && button_data.actions) {
            buildActions(button_data, folder_name, folder_data, column, row, constructor_id);
        } else {
            buildButton(button_data, folder_name, folder_data, column, row, constructor_id);
        }
        modal.close();
        window.dialogopen = false;
    });
    dialog_content.appendChild(submit_button);
};