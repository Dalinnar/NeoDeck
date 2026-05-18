// settings.js - Main settings page logic

let original_values = {};
let currentCategory = null;

// These will be set from the HTML page

function getTranslation(key) {
    if (!(key in translations)) {
        console.log(`Missing translation: ${key}`);
    }

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

        case 'textarea':
            input = document.createElement('textarea');
            input.value = current_value ?? '';
            input.rows = descriptor.rows || 4;
            if (is_secret) input.classList.add('secret');
            break;

        case 'password':
            input = document.createElement('input');
            input.type = 'password';
            input.value = current_value ?? '';
            break;

        case 'color':
            input = document.createElement('input');
            input.type = 'color';
            input.value = current_value || '#000000';
            break;

        case 'range':
            input = document.createElement('input');
            input.type = 'range';
            input.min = descriptor.min ?? 0;
            input.max = descriptor.max ?? 100;
            input.step = descriptor.step ?? 1;
            input.value = current_value ?? descriptor.min ?? 0;
            // Show live value next to slider
            const rangeDisplay = document.createElement('span');
            rangeDisplay.classList.add('range-display');
            rangeDisplay.textContent = input.value;
            input.addEventListener('input', () => rangeDisplay.textContent = input.value);
            // Return early with custom layout
            input.id = setting;
            input.name = setting;
            input.addEventListener('change', () => markChanged());
            const rangeWrapper = document.createElement('div');
            rangeWrapper.style.display = 'flex';
            rangeWrapper.style.alignItems = 'center';
            rangeWrapper.style.gap = '8px';
            rangeWrapper.append(input, rangeDisplay);
            return [rangeWrapper, label];

        case 'integer':
            input = document.createElement('input');
            input.type = 'number';
            input.step = '1';
            input.value = current_value ?? 0;
            if (descriptor.min !== undefined) input.min = descriptor.min;
            if (descriptor.max !== undefined) input.max = descriptor.max;
            if (is_secret) input.classList.add('secret');
            break;

        case 'tags': {
            const tagWrapper = document.createElement('div');
            tagWrapper.classList.add('tags-input');
            tagWrapper.id = setting;
            tagWrapper.name = setting;
            tagWrapper.dataset.tags = JSON.stringify(
                Array.isArray(current_value) ? current_value : []
            );
            const tagList = document.createElement('div');
            tagList.classList.add('tag-list');
            const tagInput = document.createElement('input');
            tagInput.type = 'text';
            tagInput.placeholder = descriptor.placeholder || 'Add tag…';
            const renderTags = () => {
                const tags = JSON.parse(tagWrapper.dataset.tags);
                tagList.innerHTML = '';
                tags.forEach((t, i) => {
                    const chip = document.createElement('span');
                    chip.classList.add('tag-chip');
                    chip.textContent = t;
                    const rm = document.createElement('button');
                    rm.textContent = '×';
                    rm.onclick = () => {
                        tags.splice(i, 1);
                        tagWrapper.dataset.tags = JSON.stringify(tags);
                        renderTags();
                        markChanged();
                    };
                    chip.appendChild(rm);
                    tagList.appendChild(chip);
                });
            };
            tagInput.addEventListener('keydown', e => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
                    e.preventDefault();
                    const tags = JSON.parse(tagWrapper.dataset.tags);
                    const val = tagInput.value.trim().replace(/,$/, '');
                    if (val && !tags.includes(val)) {
                        tags.push(val);
                        tagWrapper.dataset.tags = JSON.stringify(tags);
                        renderTags();
                        markChanged();
                    }
                    tagInput.value = '';
                }
            });
            renderTags();
            tagWrapper.append(tagList, tagInput);
            return [tagWrapper, label];
        }

        case 'keyvalue': {
            const kvWrapper = document.createElement('div');
            kvWrapper.classList.add('kv-input');
            kvWrapper.id = setting;
            kvWrapper.name = setting;
            const pairs = current_value && typeof current_value === 'object'
                ? Object.entries(current_value)
                : [];
            kvWrapper.dataset.pairs = JSON.stringify(pairs);
            const kvTable = document.createElement('div');
            kvTable.classList.add('kv-table');
            const renderPairs = () => {
                const rows = JSON.parse(kvWrapper.dataset.pairs);
                kvTable.innerHTML = '';
                rows.forEach(([k, v], i) => {
                    const row = document.createElement('div');
                    row.classList.add('kv-row');
                    const kInput = document.createElement('input');
                    kInput.type = 'text'; kInput.value = k; kInput.placeholder = 'key';
                    const vInput = document.createElement('input');
                    vInput.type = 'text'; vInput.value = v; vInput.placeholder = 'value';
                    const rm = document.createElement('button');
                    rm.textContent = '×';
                    [kInput, vInput].forEach(inp => inp.addEventListener('input', () => {
                        rows[i] = [kInput.value, vInput.value];
                        kvWrapper.dataset.pairs = JSON.stringify(rows);
                        markChanged();
                    }));
                    rm.onclick = () => {
                        rows.splice(i, 1);
                        kvWrapper.dataset.pairs = JSON.stringify(rows);
                        renderPairs();
                        markChanged();
                    };
                    row.append(kInput, vInput, rm);
                    kvTable.appendChild(row);
                });
                const addBtn = document.createElement('button');
                addBtn.textContent = '+ Add';
                addBtn.onclick = () => {
                    rows.push(['', '']);
                    kvWrapper.dataset.pairs = JSON.stringify(rows);
                    renderPairs();
                    markChanged();
                };
                kvTable.appendChild(addBtn);
            };
            renderPairs();
            kvWrapper.appendChild(kvTable);
            return [kvWrapper, label];
        }

        case 'json': {
            input = document.createElement('textarea');
            input.value = typeof current_value === 'string'
                ? current_value
                : JSON.stringify(current_value, null, 2);
            input.rows = descriptor.rows || 6;
            input.classList.add('json-input');
            input.addEventListener('change', () => {
                try { JSON.parse(input.value); input.classList.remove('json-error'); }
                catch { input.classList.add('json-error'); }
                markChanged();
            });
            input.id = setting; input.name = setting;
            return [input, label];
        }

        case 'button': {
            const btn = document.createElement('button');
            btn.textContent = getTranslation('label__' + setting);
            btn.classList.add('action-button');
            btn.onclick = async () => {
                if (descriptor.confirm && !confirm(getTranslation('confirm__' + setting) || 'Are you sure?')) return;
                btn.disabled = true;
                try {
                    const res = await fetch(descriptor.action, { method: 'POST' });
                    btn.textContent = res.ok
                        ? (getTranslation('done__' + setting) || 'Done ✓')
                        : (getTranslation('error__' + setting) || 'Error ✗');
                } catch { btn.textContent = getTranslation('error__' + setting) || 'Error ✗'; }
                setTimeout(() => {
                    btn.textContent = getTranslation('label__' + setting);
                    btn.disabled = false;
                }, 2000);
            };
            return [btn, null];
        }

        case 'info': {
            const span = document.createElement('span');
            span.classList.add('setting-info');
            span.textContent = current_value ?? '—';
            return [span, label];
        }

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
        } else if (input.type === 'number' || input.type === 'range') {
            value = parseFloat(input.value) || 0;
        } else if (input.classList.contains('json-input')) {
            try { value = JSON.parse(input.value); }
            catch { value = input.value; }  // let the backend reject it
        } else if (input.classList.contains('tags-input')) {
            value = JSON.parse(input.dataset.tags || '[]');
        } else if (input.classList.contains('kv-input')) {
            value = Object.fromEntries(JSON.parse(input.dataset.pairs || '[]'));
        } else if (input.tagName === 'SELECT' && input.multiple) {
            value = Array.from(input.options).map(o => o.value);
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