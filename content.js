const QUICK_BUTTON_ID = "pgxQuickFillButton";
const MIN_LENGTH = 12;
const DEFAULT_GENERATOR_SETTINGS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true
};

let quickButton;
let quickFillTarget = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofillPassword") {
    const result = fillBestField(request.password);
    sendResponse(result);
    return true;
  }

  if (request.action === "autofillGeneratedPassword") {
    generateAndFillFromPage().then(sendResponse);
    return true;
  }

  return undefined;
});

document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (isFillableField(target)) {
    quickFillTarget = target;
    showQuickFillButton(target);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!quickButton) {
    return;
  }

  if (quickButton.contains(event.target)) {
    return;
  }

  const active = document.activeElement;
  if (isFillableField(active)) {
    return;
  }

  hideQuickFillButton();
});

window.addEventListener("scroll", () => {
  if (quickButton && quickButton.style.display !== "none" && quickFillTarget) {
    positionQuickFillButton(quickFillTarget);
  }
}, true);

window.addEventListener("resize", () => {
  if (quickButton && quickButton.style.display !== "none" && quickFillTarget) {
    positionQuickFillButton(quickFillTarget);
  }
});

function showQuickFillButton(target) {
  quickButton = quickButton || createQuickFillButton();
  positionQuickFillButton(target);
  quickButton.style.display = "inline-flex";
}

function hideQuickFillButton() {
  if (quickButton) {
    quickButton.style.display = "none";
  }
}

function createQuickFillButton() {
  const button = document.createElement("button");
  button.id = QUICK_BUTTON_ID;
  button.type = "button";
  button.textContent = "Use Generated Password";

  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", async (event) => {
    event.preventDefault();

    const response = await generateAndFillFromPage();
    if (!response.success) {
      button.textContent = "Unable to fill";
      setTimeout(() => {
        button.textContent = "Use Generated Password";
      }, 1200);
      return;
    }

    button.textContent = "Filled";
    setTimeout(() => {
      button.textContent = "Use Generated Password";
      hideQuickFillButton();
    }, 900);
  });

  document.documentElement.appendChild(button);
  return button;
}

function positionQuickFillButton(target) {
  if (!quickButton || !target || typeof target.getBoundingClientRect !== "function") {
    return;
  }

  const rect = target.getBoundingClientRect();
  quickButton.style.top = `${window.scrollY + rect.top + rect.height + 6}px`;
  quickButton.style.left = `${window.scrollX + rect.left}px`;
}

async function generateAndFillFromPage() {
  try {
    const settings = await chrome.storage.sync.get(DEFAULT_GENERATOR_SETTINGS);
    const password = generatePasswordFromSettings(settings);
    return fillBestField(password);
  } catch (error) {
    return { success: false, error: "Could not generate password." };
  }
}

function fillBestField(password) {
  if (!password) {
    return { success: false, error: "Missing password value." };
  }

  const active = getActiveElementIncludingShadow(document);
  if (isFillableField(active)) {
    setElementValue(active, password);
    return { success: true, target: describeElement(active) };
  }

  const fields = getCandidatesByPriority();
  const candidate = fields.find((field) => isVisible(field));

  if (!candidate) {
    return { success: false, error: "No editable field available for autofill." };
  }

  setElementValue(candidate, password);
  candidate.focus();
  return { success: true, target: describeElement(candidate) };
}

function getCandidatesByPriority() {
  const all = collectEditableElements(document);
  const passwordFields = all.filter((element) => {
    if (!(element instanceof HTMLInputElement)) {
      return false;
    }
    const type = element.type ? element.type.toLowerCase() : "text";
    return type === "password";
  });

  const passwordLikeFields = all.filter((element) => {
    const signal = [
      element.name || "",
      element.id || "",
      element.getAttribute("autocomplete") || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || ""
    ].join(" ").toLowerCase();
    return /pass|pwd|secret/.test(signal);
  });

  const otherTextFields = all.filter((element) => !passwordFields.includes(element) && !passwordLikeFields.includes(element));

  return uniqueElements([...passwordFields, ...passwordLikeFields, ...otherTextFields]);
}

function collectEditableElements(root) {
  const collected = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const element = walker.currentNode;

    if (isFillableField(element)) {
      collected.push(element);
    }

    if (element.shadowRoot) {
      collected.push(...collectEditableElements(element.shadowRoot));
    }
  }

  return collected;
}

function getActiveElementIncludingShadow(root) {
  let current = root.activeElement;

  while (current && current.shadowRoot && current.shadowRoot.activeElement) {
    current = current.shadowRoot.activeElement;
  }

  return current;
}

function isFillableField(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return !element.hasAttribute("readonly") && !element.hasAttribute("disabled");
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }

  if (element instanceof HTMLInputElement) {
    if (element.readOnly || element.disabled) {
      return false;
    }

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

    const type = element.type ? element.type.toLowerCase() : "text";
    return !blockedTypes.has(type);
  }

  return false;
}

function setElementValue(element, value) {
  if (element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    return;
  }

  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor && typeof descriptor.set === "function") {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function uniqueElements(elements) {
  return [...new Set(elements)];
}

function describeElement(element) {
  if (!element) {
    return "field";
  }
  const label = element.getAttribute("aria-label") || element.name || element.id || element.tagName.toLowerCase();
  return label;
}

function generatePasswordFromSettings(settings) {
  const effective = {
    length: Math.max(MIN_LENGTH, Math.min(64, Number(settings.length) || 16)),
    uppercase: Boolean(settings.uppercase),
    lowercase: Boolean(settings.lowercase),
    numbers: Boolean(settings.numbers),
    symbols: Boolean(settings.symbols)
  };

  const charsets = [];
  if (effective.uppercase) {
    charsets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  }
  if (effective.lowercase) {
    charsets.push("abcdefghijklmnopqrstuvwxyz");
  }
  if (effective.numbers) {
    charsets.push("0123456789");
  }
  if (effective.symbols) {
    charsets.push("!@#$%^&*()-_=+[]{};:,.?/");
  }

  if (charsets.length === 0) {
    charsets.push("abcdefghijklmnopqrstuvwxyz");
  }

  const required = charsets.map((set) => set[secureRandomInt(set.length)]);
  const all = charsets.join("");

  while (required.length < effective.length) {
    required.push(all[secureRandomInt(all.length)]);
  }

  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

function secureRandomInt(maxExclusive) {
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - ((maxUint32 + 1) % maxExclusive);
  const value = new Uint32Array(1);

  do {
    crypto.getRandomValues(value);
  } while (value[0] > limit);

  return value[0] % maxExclusive;
}
