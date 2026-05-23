// button_ui.js

const createButtonTemplate = (button_data) => {
    const button_template = document.createElement("div");
    button_template.classList.add("button_template");
    button_template.style.backgroundColor = "#393939";

    const text_div = document.createElement("div");
    text_div.classList.add("button_text_div");

    const button_text = document.createElement("h3");
    button_text.textContent = "";
    button_text.name = "button_text";
    button_text.id = "button_text";
    text_div.appendChild(button_text);
    button_template.appendChild(text_div);

    if (button_data.command === "#monitor") {
        Initialize_monitors();
        const h2 = document.createElement("h2");
        const { collect_data_from } = button_data;

        if (!collect_data_from.includes("{") && !collect_data_from.includes("}")) {
            h2.setAttribute("data_from", collect_data_from ?? "");
        } else {
            const variables = collect_data_from.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];
            const updateDataFrom = () => {
                let updatedDataFrom = collect_data_from;
                variables.forEach(variable => {
                    const input = document.querySelector(`[name="${variable}"]`);
                    if (input) {
                        let inputValue = input.value || (input.tagName === "SELECT" && input.options[0]?.value) || "";
                        updatedDataFrom = updatedDataFrom.replace(new RegExp(`{${variable}}`, "g"), inputValue);
                    }
                });
                h2.setAttribute("data_from", updatedDataFrom);
            };
            updateDataFrom();
            variables.forEach(variable => {
                const input = document.querySelector(`[name="${variable}"]`);
                if (input) {
                    input.addEventListener("input", updateDataFrom);
                    if (input.tagName === "SELECT") input.addEventListener("click", updateDataFrom);
                }
            });
        }
        text_div.appendChild(h2);
    }

    if (button_data.command?.startsWith("!")) {
        // Create knob preview instead of slider
        const knobContainer = document.createElement("div");
        knobContainer.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        `;
        
        const knob = document.createElement("div");
        knob.classList.add("knob");
        
        const knobInner = document.createElement("div");
        knobInner.classList.add("knob-inner");
        
        const knobDot = document.createElement("div");
        knobDot.classList.add("knob-dot");
        
        const knobLabel = document.createElement("div");
        knobLabel.classList.add("knob-label");
        const minVal = parseFloat(button_data.min) || 0;
        const maxVal = parseFloat(button_data.max) || 100;
        const midValue = Math.round((minVal + maxVal) / 2);
        knobLabel.textContent = midValue.toString();
        
        knobInner.appendChild(knobDot);
        knob.appendChild(knobInner);
        knobContainer.appendChild(knob);
        knobContainer.appendChild(knobLabel);
        
        text_div.style.zIndex = "3";
        button_template.appendChild(knobContainer);
    }

    const img = document.createElement("img");
    let imageSource = button_data.style?.image ?? "empty_img.png";
    imageSource = imageSource || "empty_img.png";
    img.src = imageSource.includes("/") ? imageSource : `/static/img/${imageSource}`;
    img.classList.add("button_image");
    img.style.width = "80%";
    img.style.height = "auto";
    button_template.appendChild(img);

    button_template.addEventListener("click", () => open_image_gallery(img));

    return button_template;
};

const createCustomizationControls = (button_template) => {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.name = "background_color";
    colorInput.id = "button_color_input";
    colorInput.value = "#1e1e1e";
    colorInput.addEventListener("input", (e) => button_template.style.backgroundColor = e.target.value);

    let text_div = document.getElementsByClassName("button_text_div")[0];

    const text_color_input = document.createElement("input");
    text_color_input.type = "color";
    text_color_input.id = "text_color_input";
    text_color_input.name = "text_color";
    text_color_input.addEventListener("input", (e) => text_div.style.color = e.target.value);

    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Color:";
    colorLabel.htmlFor = colorInput.id;

    const sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.name = "img_size";
    sizeSlider.min = "0";
    sizeSlider.max = "100";
    sizeSlider.value = "80";
    sizeSlider.addEventListener("input", (e) => {
        const imgOrSvg = button_template.querySelector("img") || button_template.querySelector("svg");
        imgOrSvg.style.width = e.target.value + "%";
    });

    return { colorLabel, colorInput, text_color_input, sizeSlider };
};

// Global setup_actions - used by generate_button and editors
function setup_actions(button_data) {
    const createElement = (type, className = '', text = '') => {
        const elem = document.createElement(type);
        if (className) elem.classList.add(className);
        if (text) elem.textContent = text;
        return elem;
    };

    const actions = createElement("div");
    const global_inputs_container = createElement("div", "global-inputs-container");

    const select_options = document.createDocumentFragment();
    const noneOption = createElement("option", "", getTranslation("NONE"));
    noneOption.value = "None";
    noneOption.selected = true;
    select_options.appendChild(noneOption);

    if (button_data.commands) {
        Object.entries(button_data.commands).forEach(([key, value]) => {
            const option = createElement("option", "", key);
            option.value = value;
            option.textContent = getTranslation("option_verbose_" + key);
            select_options.appendChild(option);
        });
    }

    if (button_data.inputs && button_data.inputs.length > 0) {
        button_data.inputs
            .filter(input => input.shared === true)
            .forEach(input => {
                const globalInput = { ...input, name: "global_" + input.name };
                const inputContainer = createInputField(globalInput);
                global_inputs_container.appendChild(inputContainer);
            });
    }

    const actions_fragment = document.createDocumentFragment();

    if (button_data.actions && button_data.actions.length > 0) {
        button_data.actions.forEach(action => {
            const action_container = createElement("div", "action-container");
            const label = createElement("label", "command-label", getTranslation("ACTION_NAME_" + action));
            const action_select = createElement("select", "command-select");
            action_select.name = action;
            action_select.appendChild(select_options.cloneNode(true));
            action_select.id = "command-select-" + action;
            action_select.addEventListener("change", function () { update_inputs(this); });

            const inputs_container = createElement("div", "inputs_container");

            if (button_data.inputs && button_data.inputs.length > 0) {
                button_data.inputs
                    .filter(input => input.shared !== true)
                    .forEach(input => {
                        const actionInput = {
                            ...input,
                            name: input.name,
                            label: getTranslation("ACTION_" + input.name),
                            id: action + "_" + input.name
                        };
                        const inputContainer = createInputField(actionInput);
                        inputContainer.style.display = "none";
                        inputContainer.querySelectorAll('input, select, textarea').forEach(elem => {
                            elem.disabled = true;
                            elem.id = action + "_" + input.name;
                            elem.style.display = "block";
                        });
                        inputs_container.appendChild(inputContainer);
                    });
            }

            action_container.append(label, action_select, inputs_container);
            actions_fragment.appendChild(action_container);
        });
    }

    actions.appendChild(actions_fragment);
    actions.appendChild(global_inputs_container);
    return actions;
}