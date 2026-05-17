// button_builder.js

async function buildButton(button_data, folder_name, folder_data, column, row, constructor_id) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return;
    }

    const replacePlaceholders = createReplacer(inputs, false);

    const obj = {
        command: replacePlaceholders(button_data.command),
        column,
        row,
        endcolumn: column + 1,
        endrow: row + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        toggleable: button_data.toggleable ?? false,
        constructor: constructor_id,
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    if (button_data.command === "#monitor") {
        obj.track = button_data.track;
        obj.collect_data_from = replacePlaceholders(button_data.collect_data_from);
    }

    if (button_data.command.startsWith("!")) {
        obj.min = button_data.min;
        obj.max = button_data.max;
    }

    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            const fileData = await handleFileUpload(input.files[0]);
            obj.command = obj.command.replace(new RegExp(`{${input.name}}`, 'g'), fileData?.file_path || "");
        }
    }));

    folder_data.buttons.push(obj);

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error processing inputs:", error);
    }
}

async function buildActions(button_data, folder_name, folder_data, column, row, constructor_id) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries([...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input]));

    const requiredInputs = Object.entries(inputs).filter(([name, input]) => input.required && !input.value);
    if (requiredInputs.length > 0) {
        const missingInputs = requiredInputs.map(([name, input]) => input.placeholder || name).join(", ");
        alert(`Please fill in the following required inputs: ${missingInputs}`);
        return;
    }

    const replacePlaceholders = createReplacer(inputs, true);

    const obj = {
        column,
        row,
        endcolumn: column + 1,
        endrow: row + 1,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        btn_text: inputs.button_text?.value,
        constructor: constructor_id,
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("/static/img/empty_img.png")) {
        const src = document.querySelector(".button_image").src;
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    let hasConfiguredAction = false;

    button_data.actions.forEach(action => {
        if (!inputs[action] || inputs[action].value === "None") return;

        hasConfiguredAction = true;
        let command = replacePlaceholders(inputs[action].value);
        let variables = command.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

        let parent = inputs[action].closest('.action-container');
        let inputs_container = parent.querySelector(".inputs_container");

        variables.forEach(variable => {
            let input = inputs_container.querySelector(`[name="${variable}"]`);
            if (!input) input = inputs_container.querySelector(`#${action}_${variable}`);
            if (!input && inputs[`global_${variable}`]) input = inputs[`global_${variable}`];
            if (input) command = command.replace(new RegExp(`{${variable}}`, 'g'), input.value);
        });

        obj[action] = command;
    });

    if (!hasConfiguredAction) {
        alert("Cannot save an empty button. Please configure at least one action.");
        return;
    }

    await Promise.all(Object.values(inputs).map(async (input) => {
        if (input.type === "file" && input.files.length > 0) {
            try {
                const fileData = await handleFileUpload(input.files[0]);
                if (fileData && fileData.file_path) {
                    Object.keys(obj).forEach(key => {
                        if (typeof obj[key] === 'string') {
                            obj[key] = obj[key].replace(new RegExp(`{${input.name.replace('global_', '')}}`, 'g'), fileData.file_path);
                        }
                    });
                }
            } catch (error) {
                console.error(`Error uploading file for ${input.name}:`, error);
            }
        }
    }));

    button_data.actions.forEach(action => {
        if (obj[action] && obj[action].startsWith("!")) {
            obj.min = button_data.min;
            obj.max = button_data.max;
        }
        if (obj[action] && obj[action] === "#monitor") {
            obj.track = button_data.track;
            if (button_data.collect_data_from) {
                obj.collect_data_from = replacePlaceholders(button_data.collect_data_from);
            }
        }
    });

    folder_data.buttons.push(obj);

    try {
        const result = await uploadFolderData(folder_name, folder_data);
        updateGrid(result.folder);
    } catch (error) {
        console.error("Error processing inputs:", error);
    }
}

async function buildMultiactionButton(button_data, folder_name, folder_data, column, row, localButtonData, constructor_id) {
    const dialog = document.getElementById("button_creator_dialog");
    const inputs = Object.fromEntries(
        [...dialog.querySelectorAll("[name]:not([disabled])")].map(input => [input.name, input])
    );

    const actions = collectMultiactionButtons(localButtonData);
    if (!actions.length) {
        alert("Multiaction button must contain at least one button");
        return;
    }

    const obj = {
        command: "__multiaction__",
        column,
        row,
        endcolumn: column + 1,
        endrow: row + 1,
        btn_text: inputs.button_text?.value,
        background_color: inputs.background_color?.value || "#1e1e1e",
        text_color: inputs.text_color?.value || "#ffffff",
        constructor: constructor_id,
        actions
    };

    if (inputs.img_size || !document.querySelector(".button_image").src.includes("empty_img")) {
        const src = document.querySelector(".button_image").src;
        obj.image = src.startsWith(window.location.origin) ? src.replace(window.location.origin, "") : src;
        obj.image_size = inputs.img_size?.value || "80";
    }

    folder_data.buttons.push(obj);

    const result = await uploadFolderData(folder_name, folder_data);
    updateGrid(result.folder);
}