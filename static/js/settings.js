// settings.js - Main settings page logic

let original_values = {};
let currentCategory = null;

// These will be set from the HTML page

function getTranslation(key) {
    return translations[key] || key;
}

function load_category(categ) {
    currentCategory = categ;
    const settings_container = document.querySelector('.settings_container');
    settings_container.innerHTML = '';

    const category_schema = schema[categ];
    const category_settings = settings[categ] || {};

    // Store original values when loading a category
    original_values[categ] = { ...category_settings };

    Object.entries(category_schema).forEach(([setting, descriptor]) => {
        // Skip non-field descriptors or those without a type
        if (!descriptor || typeof descriptor !== 'object' || !descriptor.type) {
            return;
        }

        const setting_type = descriptor.type;
        const current_value = category_settings[setting] ?? descriptor.default;
        const is_secret = descriptor.secret === true;

        const div = document.createElement('div');
        div.classList.add('setting-item');

        // Create input based on schema type
        const [input, label] = createSettingInput(setting, descriptor, current_value, is_secret);

        // Special layout for boolean (checkbox)
        if (setting_type === 'boolean') {
            Object.assign(div.style, { flexDirection: "row-reverse", alignItems: "center" });
        }

        div.append(...[label, input].filter(Boolean));
        settings_container.appendChild(div);

        // Initialize multiselect if needed
        if (setting_type === 'multiselect') {
            multiselect(input.id);
        }
    });

    // Add reset button functionality
    const reset_button = document.querySelector('#reset_button');
    if (reset_button) reset_button.onclick = () => resetSettings(categ);
}

function createSettingInput(setting, descriptor, current_value, is_secret) {
    let input;
    let label = null;
    const setting_type = descriptor.type;

    // Handle special display-only types
    if (setting_type === 'link') {
        const link = document.createElement('a');
        link.classList.add('setting-text');
        link.href = descriptor.url || '#';
        link.target = '_blank';
        link.textContent = getTranslation("label__" + setting);
        return [link, null];
    }

    if (setting_type === 'status') {
        const endpoint = descriptor.endpoint || '/status';
        const statusId = setting;

        const wrapper = document.createElement('div');
        wrapper.classList.add('status-check-item');

        const dot = document.createElement('span');
        dot.classList.add('status-dot', 'status-unknown');
        dot.id = `status-dot-${statusId}`;

        const msg = document.createElement('span');
        msg.classList.add('status-msg');
        msg.textContent = '...';

        const btn = document.createElement('button');
        btn.textContent = '↺';
        btn.title = 'Recheck';
        btn.onclick = () => fetchStatus(endpoint, dot, msg);

        wrapper.append(dot, msg, btn);

        // Auto-check on load
        fetchStatus(endpoint, dot, msg);

        return [wrapper, null];
    }

    // Create label for standard input types
    label = document.createElement('label');
    label.htmlFor = setting;
    label.textContent = getTranslation("label__" + setting);

    // Create input based on type
    switch (setting_type) {
        case 'boolean':
            input = document.createElement('input');
            input.classList.add('custom-checkbox');
            input.type = 'checkbox';
            input.checked = current_value;
            break;

        case 'number':
            input = document.createElement('input');
            input.type = 'number';
            input.value = current_value;
            if (is_secret) input.classList.add('secret');
            break;

        case 'text':
            input = document.createElement('input');
            input.type = 'text';
            input.value = current_value;
            if (is_secret) input.classList.add('secret');
            break;

        case 'select':
            input = document.createElement('select');
            const options = descriptor.options || {};
            Object.entries(options).forEach(([key, val]) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = val;
                opt.selected = current_value === key;
                input.appendChild(opt);
            });
            break;

        case 'multiselect':
            input = document.createElement('select');
            input.multiple = true;
            const value_array = Array.isArray(current_value) ? current_value : [];
            [...new Set(value_array)].forEach(val => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = val;
                input.appendChild(opt);
            });
            break;

        default:
            // Fallback to text input
            input = document.createElement('input');
            input.type = 'text';
            input.value = current_value;
            if (is_secret) input.classList.add('secret');
            break;
    }

    input.id = setting;
    input.name = setting;
    input.addEventListener('change', () => markChanged());

    return [input, label];
}

function markChanged() {
    const save_button = document.querySelector('#save_button');
    if (save_button) {
        save_button.disabled = false;
    }
}

function resetSettings(categ) {
    const settings_container = document.querySelector('.settings_container');
    const inputs = settings_container.querySelectorAll('.setting-item input, .setting-item select');

    inputs.forEach(input => {
        const setting = input.id;
        const originalValue = original_values[categ][setting];

        if (input.type === 'checkbox') {
            input.checked = originalValue !== undefined ? originalValue : false;
        } else if (input.tagName === 'SELECT' && input.multiple) {
            // Re-initialize multiselect with original values
            input.innerHTML = '';
            const values = Array.isArray(originalValue) ? originalValue : [];
            values.forEach(val => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = val;
                input.appendChild(opt);
            });
            multiselect(input.id);
        } else if (input.tagName === 'SELECT') {
            input.value = originalValue !== undefined ? originalValue : '';
        } else {
            input.value = originalValue !== undefined ? originalValue : '';
        }
    });

    const save_button = document.querySelector('#save_button');
    if (save_button) {
        save_button.disabled = true;
    }
}

function saveSettings() {
    const settings_container = document.querySelector('.settings_container');
    const inputs = settings_container.querySelectorAll('.setting-item input, .setting-item select');

    let updatedSettings = {};

    inputs.forEach(input => {
        const setting = input.id;
        let value;

        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = parseFloat(input.value) || 0;
        } else if (input.tagName === 'SELECT' && input.multiple) {
            value = [];
            for (let i = 0; i < input.options.length; i++) {
                value.push(input.options[i].value);
            }
        } else if (input.tagName === 'SELECT') {
            value = input.value;
        } else {
            value = input.value;
        }

        updatedSettings[setting] = value;
    });

    const data = {
        [currentCategory]: updatedSettings
    };

    console.log("Saving category:", currentCategory);
    console.log("Data:", data);

    fetch('/save_settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Settings saved successfully');
                const save_button = document.querySelector('#save_button');
                if (save_button) {
                    save_button.disabled = true;
                }
                location.reload();
            } else {
                console.error('Error saving settings');
            }
        })
        .catch(error => {
            console.error('Error saving settings:', error);
        });
}

async function fetchStatus(endpoint, dot, msg) {
    dot.className = 'status-dot status-connecting';
    msg.textContent = '...';

    try {
        const res = await fetch(endpoint);
        if (res.ok) {
            dot.className = 'status-dot status-ok';
            msg.textContent = getTranslation('status_connected') || 'Connected';
        } else {
            dot.className = 'status-dot status-error';
            msg.textContent = `${getTranslation('status_error') || 'Error'} (${res.status})`;
        }
    } catch {
        dot.className = 'status-dot status-error';
        msg.textContent = getTranslation('status_unreachable') || 'Unreachable';
    }
}

// Initialize navigation
function initializeNavigation() {
    const section_container = document.querySelector('.section_container');

    // Create navigation sections for each category
    for (const categ in schema) {
        // Skip empty categories
        if (Object.keys(schema[categ]).length === 0) {
            continue;
        }

        const div = document.createElement('div');
        const h2 = document.createElement('h2');
        const key = categ.replace(/[\s\-]+/g, "_").toUpperCase() + "_CATEGORY_NAME";
        h2.textContent = getTranslation(key);
        h2.onclick = () => load_category(categ);
        div.appendChild(h2);
        section_container.appendChild(div);
    }
}

// Initialize save/reset buttons
function initializeButtons() {
    const settings_save_container = document.createElement('div');
    settings_save_container.classList.add('settings-buttons-container');

    const reset_button = document.createElement('button');
    const save_button = document.createElement('button');

    reset_button.textContent = getTranslation('reset');
    reset_button.id = 'reset_button';
    
    save_button.disabled = true;
    save_button.id = 'save_button';
    save_button.textContent = getTranslation('save');
    save_button.onclick = saveSettings;

    settings_save_container.appendChild(reset_button);
    settings_save_container.appendChild(save_button);

    const body = document.querySelector('body');
    if (body) {
        body.appendChild(settings_save_container);
    } else {
        console.error("Could not find body element.");
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeButtons();
});