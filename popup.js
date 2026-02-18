const DEFAULT_SETTINGS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true
};

const MIN_LENGTH = 12;
const MAX_LENGTH = 64;

const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/";

const elements = {
  password: document.getElementById("password"),
  length: document.getElementById("length"),
  lengthRange: document.getElementById("lengthRange"),
  uppercase: document.getElementById("uppercase"),
  lowercase: document.getElementById("lowercase"),
  numbers: document.getElementById("numbers"),
  symbols: document.getElementById("symbols"),
  strengthLabel: document.getElementById("strengthLabel"),
  strengthBar: document.getElementById("strengthBar"),
  status: document.getElementById("status"),
  regenerate: document.getElementById("regenerate"),
  copyBtn: document.getElementById("copyBtn"),
  autofillBtn: document.getElementById("autofillBtn"),
  copyFillBtn: document.getElementById("copyFillBtn")
};

let currentPassword = "";

init().catch((error) => {
  showStatus(error.message || "Failed to initialize popup.", true);
});

async function init() {
  const saved = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  applySettings(saved);
  attachEvents();
  regeneratePassword();
}

function applySettings(settings) {
  const length = clampNumber(settings.length, MIN_LENGTH, MAX_LENGTH);
  elements.length.value = String(length);
  elements.lengthRange.value = String(length);
  elements.uppercase.checked = Boolean(settings.uppercase);
  elements.lowercase.checked = Boolean(settings.lowercase);
  elements.numbers.checked = Boolean(settings.numbers);
  elements.symbols.checked = Boolean(settings.symbols);
}

function attachEvents() {
  const toggleInputs = [
    elements.uppercase,
    elements.lowercase,
    elements.numbers,
    elements.symbols
  ];

  elements.length.addEventListener("input", () => {
    const length = clampNumber(elements.length.value, MIN_LENGTH, MAX_LENGTH);
    elements.length.value = String(length);
    elements.lengthRange.value = String(length);
    persistSettings();
    regeneratePassword();
  });

  elements.lengthRange.addEventListener("input", () => {
    elements.length.value = elements.lengthRange.value;
    persistSettings();
    regeneratePassword();
  });

  toggleInputs.forEach((el) => {
    el.addEventListener("change", () => {
      if (!hasEnabledCharset()) {
        el.checked = true;
        showStatus("At least one character set must stay enabled.", true);
        return;
      }
      persistSettings();
      regeneratePassword();
    });
  });

  elements.regenerate.addEventListener("click", regeneratePassword);

  elements.copyBtn.addEventListener("click", async () => {
    await copyCurrentPassword();
  });

  elements.autofillBtn.addEventListener("click", async () => {
    await autofillInActiveTab(currentPassword);
  });

  elements.copyFillBtn.addEventListener("click", async () => {
    const copied = await copyCurrentPassword(false);
    if (copied) {
      await autofillInActiveTab(currentPassword);
    }
  });
}

function regeneratePassword() {
  const settings = getCurrentSettings();

  if (!hasEnabledCharset(settings)) {
    showStatus("Enable at least one character set.", true);
    return;
  }

  currentPassword = generatePassword(settings);
  elements.password.textContent = currentPassword;
  updateStrength(currentPassword, settings);
  showStatus("Password refreshed.");
}

function getCurrentSettings() {
  return {
    length: clampNumber(elements.length.value, MIN_LENGTH, MAX_LENGTH),
    uppercase: elements.uppercase.checked,
    lowercase: elements.lowercase.checked,
    numbers: elements.numbers.checked,
    symbols: elements.symbols.checked
  };
}

function hasEnabledCharset(settings = getCurrentSettings()) {
  return settings.uppercase || settings.lowercase || settings.numbers || settings.symbols;
}

function generatePassword(settings) {
  const charsets = [];
  if (settings.uppercase) {
    charsets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  }
  if (settings.lowercase) {
    charsets.push("abcdefghijklmnopqrstuvwxyz");
  }
  if (settings.numbers) {
    charsets.push("0123456789");
  }
  if (settings.symbols) {
    charsets.push(SYMBOLS);
  }

  const requiredChars = charsets.map((set) => pickRandomChar(set));
  const allChars = charsets.join("");
  const remaining = settings.length - requiredChars.length;
  const passwordChars = [...requiredChars];

  for (let i = 0; i < remaining; i += 1) {
    passwordChars.push(pickRandomChar(allChars));
  }

  return shuffle(passwordChars).join("");
}

function pickRandomChar(charset) {
  const index = getSecureRandomInt(charset.length);
  return charset[index];
}

function getSecureRandomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    throw new Error("Invalid random range.");
  }

  const maxUint32 = 0xFFFFFFFF;
  const biasThreshold = maxUint32 - ((maxUint32 + 1) % maxExclusive);
  const randomValues = new Uint32Array(1);

  do {
    crypto.getRandomValues(randomValues);
  } while (randomValues[0] > biasThreshold);

  return randomValues[0] % maxExclusive;
}

function shuffle(array) {
  const output = [...array];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = getSecureRandomInt(i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

async function copyCurrentPassword(showMessage = true) {
  if (!currentPassword) {
    showStatus("No password to copy.", true);
    return false;
  }

  try {
    await navigator.clipboard.writeText(currentPassword);
    if (showMessage) {
      showStatus("Password copied to clipboard.");
    }
    return true;
  } catch (error) {
    showStatus("Clipboard failed. Check browser clipboard permissions.", true);
    return false;
  }
}

async function autofillInActiveTab(password) {
  if (!password) {
    showStatus("Generate a password first.", true);
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || typeof tab.id !== "number") {
      showStatus("No active tab found.", true);
      return;
    }

    try {
      const response = await sendMessageToTab(tab.id, {
        action: "autofillPassword",
        password
      });

      if (response && response.success) {
        showStatus(`Autofilled ${response.target || "field"}.`);
        return;
      }
    } catch (messageError) {
      // Fallback to direct injection when a content script is unavailable.
    }

    const fallback = await injectAutofillScript(tab.id, password);
    if (fallback.success) {
      showStatus(`Autofilled ${fallback.target || "field"}.`);
      return;
    }

    showStatus(fallback.error || "No suitable field found on page.", true);
  } catch (error) {
    showStatus("Autofill failed on this page.", true);
  }
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function injectAutofillScript(tabId, password) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    args: [password],
    func: (value) => {
      const blockedTypes = new Set([
        "button",
        "checkbox",
        "color",
        "date",
        "datetime-local",
        "file",
        "hidden",
        "image",
        "month",
        "radio",
        "range",
        "reset",
        "submit",
        "time",
        "week"
      ]);

      const editable = (el) => {
        if (!(el instanceof HTMLElement)) {
          return false;
        }
        if (el instanceof HTMLInputElement) {
          const type = (el.type || "text").toLowerCase();
          return !el.readOnly && !el.disabled && !blockedTypes.has(type) && type === "password";
        }
        return false;
      };

      const setValue = (el, v) => {
        if (el instanceof HTMLInputElement) {
          const proto = HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
          if (descriptor && typeof descriptor.set === "function") {
            descriptor.set.call(el, v);
          } else {
            el.value = v;
          }
        }
        el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      };

      const active = document.activeElement;
      if (editable(active)) {
        setValue(active, value);
        return { success: true, target: active.name || active.id || active.tagName.toLowerCase() };
      }

      const candidates = Array.from(document.querySelectorAll("input[type='password']"));
      const chosen = candidates.find((el) => editable(el));

      if (!chosen) {
        return { success: false, error: "No password field available for autofill." };
      }

      setValue(chosen, value);
      chosen.focus();
      return { success: true, target: chosen.name || chosen.id || chosen.tagName.toLowerCase() };
    }
  });

  return result?.result || { success: false, error: "Injection failed." };
}

function persistSettings() {
  const settings = getCurrentSettings();
  chrome.storage.sync.set(settings);
}

function updateStrength(password, settings) {
  let score = 0;
  const variety = [settings.uppercase, settings.lowercase, settings.numbers, settings.symbols].filter(Boolean).length;

  score += Math.min(40, Math.max(0, (password.length - MIN_LENGTH + 1) * 4));
  score += variety * 15;
  if (password.length >= 20) {
    score += 10;
  }
  if (password.length >= 28) {
    score += 10;
  }
  const normalized = Math.max(0, Math.min(100, score));

  elements.strengthBar.style.width = `${normalized}%`;

  if (normalized < 45) {
    elements.strengthLabel.textContent = "Fair";
  } else if (normalized < 75) {
    elements.strengthLabel.textContent = "Strong";
  } else {
    elements.strengthLabel.textContent = "Very Strong";
  }
}

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return min;
  }
  return Math.max(min, Math.min(max, parsed));
}
