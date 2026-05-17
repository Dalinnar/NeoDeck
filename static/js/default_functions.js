      function getTranslation(key) {
        if (!translations[key]) {
          console.log(`Translation key not found: ${key}`);
        }
        return translations[key] || key;
      }

function request_data(message, action = "send", method = "POST") {
  const endpoint = `/data/${action}`;
  method = method.toUpperCase();

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (method !== "GET") {
    options.body = JSON.stringify({ message });
  } else {
    // En GET no se puede enviar body, podrías enviar el mensaje como header personalizado
    options.headers['X-Message'] = message;
  }
  return fetch(endpoint, options)
    .then(response => response.json())
    .then(data => {
      if (data.success === false) {
        console.error("Error:", data.message);
        return null;
      } else {
        return data.data ?? null;
      }
    })
    .catch(error => {
      console.error("Error:", error);
      return null;
    });
}

function folder(PageName) {
  //if there not any folder passed, uses the stored folder name
  if (!PageName) {
    PageName = window.folder_name
  }
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

function vol_mixer() {
  let vol_mixer = "/retrive_audio_sessions";

  response = fetch(vol_mixer).then(response => response.json())
    .then(data => {
      console.log(data)
      updateGrid(data)

    })
}


function vt_keyboard() {
  const existing = document.getElementById('vt-keyboard-dialog');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'vt-keyboard-dialog';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 99999;
    animation: vt-fadein 0.2s ease;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1a1a2e;
    border: 1px solid #3a3a5c;
    border-radius: 20px 20px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
    animation: vt-slidein 0.25s ease;
  `;

  dialog.innerHTML = `
    <style>
      @keyframes vt-fadein { from { opacity: 0 } to { opacity: 1 } }
      @keyframes vt-slidein { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    </style>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <span style="color:#a0a0c8; font-family:monospace; font-size:13px; letter-spacing:2px; text-transform:uppercase;">⌨ VT Keyboard</span>
      <button id="vt-kb-close" style="background:none; border:none; color:#666; font-size:20px; cursor:pointer; padding:4px 8px; border-radius:6px;">✕</button>
    </div>
    <div id="vt-kb-status" style="
      font-family: monospace;
      font-size: 11px;
      color: #555;
      margin-bottom: 10px;
      min-height: 16px;
      letter-spacing: 1px;
    "></div>
    <input
      id="vt-kb-input"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="Type here — keys sent live..."
      style="
        width: 100%;
        box-sizing: border-box;
        background: #0d0d1a;
        border: 1px solid #3a3a5c;
        border-radius: 10px;
        color: #e0e0ff;
        font-family: monospace;
        font-size: 16px;
        padding: 14px 16px;
        outline: none;
        caret-color: #7b7bff;
        transition: border-color 0.2s;
      "
    />
    <div style="margin-top:10px; display:flex; gap:8px;">
      <button id="vt-kb-backspace" style="
        flex:1; padding:10px; background:#1e1e3a; border:1px solid #3a3a5c;
        border-radius:8px; color:#a0a0c8; font-family:monospace; font-size:14px;
        cursor:pointer; letter-spacing:1px;
      ">⌫</button>
      <button id="vt-kb-clear" style="
        flex:1; padding:10px; background:#1e1e3a; border:1px solid #3a3a5c;
        border-radius:8px; color:#a0a0c8; font-family:monospace; font-size:12px;
        cursor:pointer; letter-spacing:1px;
      ">CLEAR</button>
      <button id="vt-kb-enter" style="
        flex:2; padding:10px; background:#2a2a6a; border:1px solid #5a5aaa;
        border-radius:8px; color:#c0c0ff; font-family:monospace; font-size:12px;
        cursor:pointer; letter-spacing:1px;
      ">ENTER ↵</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = document.getElementById('vt-kb-input');
  const status = document.getElementById('vt-kb-status');

  setTimeout(() => input.focus(), 100);

  async function sendKey(key) {
    status.textContent = `sending: /write ${key}`;
    status.style.color = '#7b7bff';
    try {
      await fetch(`/data/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `/write ${key}` })
      });
      status.style.color = '#4caf7d';
    } catch (e) {
      status.style.color = '#e05555';
      status.textContent = `error sending key`;
    }
  }

  // FIX 2: Enter now sends "/key enter" via pyautogui
  async function sendKeyPress(keyName) {
    status.textContent = `sending: /key ${keyName}`;
    status.style.color = '#7b7bff';
    try {
      await fetch(`/data/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `/key ${keyName}` })
      });
      status.style.color = '#4caf7d';
    } catch (e) {
      status.style.color = '#e05555';
      status.textContent = `error sending key`;
    }
  }

  // FIX 1: Dedicated backspace — always fires regardless of input content
  async function sendBackspace() {
    if (input.value.length > 0) {
      input.value = input.value.slice(0, -1);
      lastValue = input.value;
    }
    await sendKeyPress('backspace');
  }

  let lastValue = '';
  input.addEventListener('input', () => {
    const current = input.value;
    if (current.length > lastValue.length) {
      const added = current.slice(lastValue.length);
      for (const char of added) {
        if (char === ' ') {
          sendKeyPress('space');  // sends /key space
        } else {
          sendKey(char);          // sends /write {char}
        }
      }
    } else if (current.length < lastValue.length) {
      // Native backspace while input has content — still send it
      sendKeyPress('backspace');
    }
    lastValue = current;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendKeyPress('enter'); // FIX 2
    } else if (e.key === 'Tab') {
      e.preventDefault();
      sendKeyPress('tab');
    } else if (e.key === 'Escape') {
      closeDialog();
    }
  });

  // Buttons
  document.getElementById('vt-kb-enter').addEventListener('click', () => sendKeyPress('enter')); // FIX 2
  document.getElementById('vt-kb-backspace').addEventListener('click', sendBackspace); // FIX 1
  document.getElementById('vt-kb-clear').addEventListener('click', () => {
    input.value = '';
    lastValue = '';
    status.textContent = '';
    input.focus();
  });

  function closeDialog() {
    overlay.style.animation = 'vt-fadein 0.15s ease reverse';
    setTimeout(() => overlay.remove(), 150);
  }

  document.getElementById('vt-kb-close').addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
}