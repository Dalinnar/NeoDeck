// utils.js

function createReplacer(inputs, useGlobalFallback = false) {
    return (str) => {
        return str.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
            let key = name;
            if (useGlobalFallback && !inputs[key]) {
                key = `global_${name}`;
            }
            const input = inputs[key];
            if (!input) return match; // no lo toques si no es un placeholder tuyo
            if (input.type === "checkbox") return input.checked;
            return input.value ?? "";
        });
    };
}

function get_data_from_url(url) {
    return fetch(url)
        .then(response => response.json())
        .then(data => data)
        .catch(error => console.error(error));
}

function update_inputs(selectElement) {
    const parent = selectElement.parentElement;
    const selected_option = selectElement.options[selectElement.selectedIndex];
    const variables = selected_option.value.match(/\{(.*?)\}/g)?.map(v => v.replace(/[{}]/g, "")) || [];

    parent.querySelectorAll(':scope > .inputs_container > div').forEach(container => {
        const inputElements = container.querySelectorAll('input, select, textarea');
        if (inputElements.length > 0) {
            const inputElement = inputElements[0];
            const inputName = inputElement.name;
            const shouldShow = variables.includes(inputName);

            container.style.display = shouldShow ? "block" : "none";
            inputElement.disabled = !shouldShow;

            if (!shouldShow) {
                if (inputElement.tagName === "INPUT" || inputElement.tagName === "TEXTAREA") {
                    inputElement.value = "";
                } else if (inputElement.tagName === "SELECT" && inputElement.options.length > 0) {
                    inputElement.selectedIndex = 0;
                }
            }
        }
    });
}