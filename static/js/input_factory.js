// input_factory.js

const createInputField = (input) => {
    if (input.TYPE === "sys folder" || input.TYPE === "sys file") {
        return createSysInputField(input);
    }
    if (input.TYPE == "macro_rec") {
        return createMacroInput(input);
    }

    let [element, type] = input.TYPE.split(" ");

    if (!input.name) alert("Input name is undefined");

    const label = document.createElement("label");
    label.textContent = getTranslation(`input_label__${(input.label || input.name).replace(/\s+/g, "_")}`);

    const _input = document.createElement(element);
    _input.name = input.name;

    Object.entries(input.attributes ?? {}).forEach(([k, v]) => _input.setAttribute(k, v));

    if (input.required) _input.required = true;
    if (element === "input" && type) _input.setAttribute("type", type);
    if (input.id) _input.id = input.id;
    if (element === "select") setupSelectInput(_input, input);
    if (element === "input" && type === "checkbox") setupCheckboxInput(_input, input);

    const container = document.createElement("div");
    container.classList.add("input-container");

    if (input.dependant_on) {
        container.style.display = "none";
        _input.setAttribute("data-dependant", input.dependant_on);
        container.setAttribute("data-dependant", input.dependant_on);
    }

    container.appendChild(label);
    container.appendChild(_input);
    setup_input(_input);
    return container;
};

function setup_input(input) {
    if (input.type === "checkbox") {
        input.parentElement.style.flexDirection = "row-reverse";
        input.parentElement.style.justifyContent = "start";
    }
}

const createSysInputField = (input) => {
    const container = document.createElement("div");
    container.classList.add("input-container");

    const label = document.createElement("label");
    label.textContent = getTranslation(`input_label__${(input.label || input.name).replace(/\s+/g, "_")}`);

    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("sys-input-wrapper");
    inputWrapper.style.display = "flex";

    const _input = document.createElement("input");
    _input.name = input.name;
    _input.type = "text";
    _input.readOnly = true;
    _input.style.flexGrow = "1";
    if (input.id) _input.id = input.id;

    const browseButton = document.createElement("button");
    browseButton.textContent = "...";
    browseButton.type = "button";
    browseButton.classList.add("browse-button");
    browseButton.style.width = "30px";

    browseButton.addEventListener("click", async () => {
        try {
            const endpoint = input.TYPE === "sys folder" ? "/get_sysfolder" : "/get_sysfile";
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            if (data && data.path) {
                _input.readOnly = false;
                _input.value = data.path;
                _input.readOnly = true;
                _input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        } catch (error) {
            console.error("Error fetching system path:", error);
            alert(`Failed to get ${input.TYPE === "sys folder" ? "folder" : "file"} path. Please try again.`);
        }
    });

    inputWrapper.appendChild(_input);
    inputWrapper.appendChild(browseButton);
    container.appendChild(label);
    container.appendChild(inputWrapper);
    return container;
};

const createMacroInput = (input) => {
    const container = document.createElement("div");
    container.classList.add("input-container");

    const label = document.createElement("label");
    label.textContent = getTranslation(`input_label__${(input.label || input.name).replace(/\s+/g, "_")}`);

    const hiddenInput = document.createElement("textarea");
    hiddenInput.name = input.name;
    hiddenInput.classList.add("macro-hidden-input");
    if (input.id) hiddenInput.id = input.id;

    const macroDisplay = document.createElement("div");
    macroDisplay.classList.add("macro-recorder");
    macroDisplay.setAttribute("tabindex", "0");

    const placeholder = document.createElement("span");
    placeholder.textContent = "Click to record shortcut...";
    placeholder.classList.add("macro-placeholder");
    macroDisplay.appendChild(placeholder);

    let isRecording = false;
    let recordedItems = [];
    let heldKeys = new Set();
    let currentCombo = null;

    const DEFAULT_DELAY_MS = 10;
    const MODIFIERS = ["Control", "Alt", "Shift", "Meta"];
    const MODIFIER_LABELS = { Control: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Meta" };

    const updateHiddenInput = () => {
        const serialized = recordedItems.map(item =>
            item.type === "combo" ? item.value : `@wait_${item.ms}ms`
        );
        hiddenInput.value = JSON.stringify(serialized);
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const buildComboFromHeld = () => {
        if (heldKeys.size === 0) return null;
        const modifiers = MODIFIERS.filter(m => heldKeys.has(m));
        const normal = [...heldKeys].filter(k => !MODIFIERS.includes(k)).map(k => k === " " ? "Space" : k);
        const parts = [...modifiers.map(m => MODIFIER_LABELS[m]), ...normal];
        return parts.length > 0 ? parts.join("+") : null;
    };

    const createDelayTag = (item, index) => {
        const tag = document.createElement("span");
        tag.classList.add("macro-delay-tag");

        const downBtn = document.createElement("button");
        downBtn.textContent = "▾";
        downBtn.classList.add("macro-delay-btn");
        downBtn.type = "button";

        const valueSpan = document.createElement("span");
        valueSpan.classList.add("macro-delay-value");
        valueSpan.textContent = `@${item.ms}ms`;

        const upBtn = document.createElement("button");
        upBtn.textContent = "▴";
        upBtn.classList.add("macro-delay-btn");
        upBtn.type = "button";

        const removeBtn = document.createElement("span");
        removeBtn.textContent = "×";
        removeBtn.classList.add("macro-tag-remove");

        const updateValue = (delta) => {
            item.ms = Math.max(0, item.ms + delta);
            valueSpan.textContent = `@${item.ms}ms`;
            updateHiddenInput();
        };

        downBtn.addEventListener("click", (e) => { e.stopPropagation(); updateValue(-10); });
        upBtn.addEventListener("click", (e) => { e.stopPropagation(); updateValue(+10); });

        tag.addEventListener("keydown", (e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); updateValue(+10); }
            if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); updateValue(-10); }
        });
        tag.addEventListener("wheel", (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateValue(e.deltaY < 0 ? +10 : -10);
        }, { passive: false });

        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            recordedItems.splice(index, 1);
            renderKeys();
            updateHiddenInput();
        });

        tag.setAttribute("tabindex", "0");
        tag.appendChild(downBtn);
        tag.appendChild(valueSpan);
        tag.appendChild(upBtn);
        tag.appendChild(removeBtn);
        return tag;
    };

    const createComboTag = (item, index) => {
        const tag = document.createElement("span");
        tag.textContent = item.value;
        tag.classList.add("macro-tag");

        const removeBtn = document.createElement("span");
        removeBtn.textContent = "×";
        removeBtn.classList.add("macro-tag-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            recordedItems.splice(index, 1);
            renderKeys();
            updateHiddenInput();
        });

        tag.appendChild(removeBtn);
        return tag;
    };

    const renderKeys = () => {
        macroDisplay.innerHTML = "";
        if (recordedItems.length === 0 && !currentCombo) {
            macroDisplay.appendChild(placeholder);
        } else {
            recordedItems.forEach((item, i) => {
                if (item.type === "combo") macroDisplay.appendChild(createComboTag(item, i));
                else macroDisplay.appendChild(createDelayTag(item, i));
            });
            if (currentCombo) {
                const preview = document.createElement("span");
                preview.textContent = currentCombo;
                preview.classList.add("macro-preview-tag");
                macroDisplay.appendChild(preview);
            }
        }
        if (isRecording) {
            const indicator = document.createElement("span");
            indicator.textContent = "● Recording...";
            indicator.classList.add("macro-recording-indicator");
            macroDisplay.appendChild(indicator);
            macroDisplay.classList.add("macro-recorder--recording");
        } else {
            macroDisplay.classList.remove("macro-recorder--recording");
        }
    };

    const onKeyDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        heldKeys.add(e.key);
        currentCombo = buildComboFromHeld();
        renderKeys();
    };

    const onKeyUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        heldKeys.delete(e.key);
        if (heldKeys.size === 0 && currentCombo) {
            if (recordedItems.length > 0 && recordedItems[recordedItems.length - 1].type === "combo") {
                recordedItems.push({ type: "delay", ms: DEFAULT_DELAY_MS });
            }
            recordedItems.push({ type: "combo", value: currentCombo });
            currentCombo = null;
            renderKeys();
            updateHiddenInput();
        }
    };

    macroDisplay.addEventListener("click", () => {
        isRecording = !isRecording;
        if (isRecording) {
            macroDisplay.addEventListener("keydown", onKeyDown);
            macroDisplay.addEventListener("keyup", onKeyUp);
            macroDisplay.focus();
        } else {
            macroDisplay.removeEventListener("keydown", onKeyDown);
            macroDisplay.removeEventListener("keyup", onKeyUp);
            heldKeys.clear();
            currentCombo = null;
        }
        renderKeys();
    });

    macroDisplay.addEventListener("blur", (e) => {
        if (macroDisplay.contains(e.relatedTarget)) return;
        if (isRecording) {
            isRecording = false;
            macroDisplay.removeEventListener("keydown", onKeyDown);
            macroDisplay.removeEventListener("keyup", onKeyUp);
            heldKeys.clear();
            currentCombo = null;
            renderKeys();
        }
    });

    container.appendChild(label);
    container.appendChild(macroDisplay);
    container.appendChild(hiddenInput);
    return container;
};

const setupSelectInput = (_input, input) => {
    let options = input.options ?? [];
    if (input.options_url) {
        get_data_from_url(input.options_url).then(data => {
            if (Array.isArray(data)) options = [...options, ...data];
            else if (typeof data === 'object' && data !== null) options = { ...(options || {}), ...data };
            else options = data;
            populateSelectOptions(_input, options, false);
        });
    } else {
        populateSelectOptions(_input, options, true);
    }

    if (!input.dependant_on) {
        _input.addEventListener("change", () => toggleDependentFields(_input.value));
        setTimeout(() => _input.dispatchEvent(new Event("change")), 0);
    }
};

const setupCheckboxInput = (_input, input) => {
    _input.addEventListener("change", () => {
        const dependantFields = document.querySelectorAll(`[data-dependant="${input.name}"]`);
        dependantFields.forEach(field => {
            field.style.display = _input.checked ? "block" : "none";
        });
    });
};

const populateSelectOptions = (_input, options, useVerbose = true) => {
    _input.innerHTML = "";
    if (Array.isArray(options)) {
        options.forEach((opt, i) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = useVerbose ? getTranslation("select_verbose_" + opt) : opt;
            if (i === 0) o.selected = true;
            _input.appendChild(o);
        });
    } else if (typeof options === 'object') {
        Object.entries(options).forEach(([k, v], i) => {
            const o = document.createElement("option");
            o.value = k;
            o.textContent = useVerbose ? getTranslation("select_verbose_" + v) : v;
            if (i === 0) o.selected = true;
            _input.appendChild(o);
        });
    }
};

const toggleDependentFields = (selectedValue) => {
    document.querySelectorAll("[data-dependant]").forEach(dep => {
        const input = dep.querySelector("input, select, textarea");
        dep.style.display = dep.getAttribute("data-dependant") === selectedValue ? "flex" : "none";
        if (input) input.disabled = dep.style.display === "none", input.value = "";
    });
};