const QUICK_BUTTON_ID = "pgxQuickFillButton";
const PASSWORD_TOGGLE_CLASS = "pgxPasswordToggle";
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
const passwordToggleRegistry = new WeakMap();
const managedPasswordInputs = new Set();
const observedRoots = new WeakSet();

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
  if (isManagedPasswordField(target)) {
    quickFillTarget = target;
    showQuickFillButton(target);
    ensurePasswordToggleForField(target);
    updatePasswordTogglePosition(target);
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && isManagedPasswordField(target)) {
    ensurePasswordToggleForField(target);
    updatePasswordTogglePosition(target);
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
  if (isManagedPasswordField(active)) {
    return;
  }

  hideQuickFillButton();
});

window.addEventListener(
  "scroll",
  () => {
    if (quickButton && quickButton.style.display !== "none" && quickFillTarget) {
      positionQuickFillButton(quickFillTarget);
    }
    positionAllPasswordToggles();
  },
  true
);

window.addEventListener("resize", () => {
  if (quickButton && quickButton.style.display !== "none" && quickFillTarget) {
    positionQuickFillButton(quickFillTarget);
  }
  positionAllPasswordToggles();
});

initializePasswordToggles();

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
  if (isManagedPasswordField(active)) {
    setElementValue(active, password);
    return { success: true, target: describeElement(active) };
  }

  const fields = getCandidatesByPriority();
  const candidate = fields.find((field) => isVisible(field));

  if (!candidate) {
    return { success: false, error: "No password field available for autofill." };
  }

  setElementValue(candidate, password);
  candidate.focus();
  return { success: true, target: describeElement(candidate) };
}

function getCandidatesByPriority() {
  return collectEditableElements(document).filter((element) => isPasswordInputField(element));
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

function isPasswordInputField(element) {
  return isFillableField(element) && element instanceof HTMLInputElement && (element.type || "").toLowerCase() === "password";
}

function isManagedPasswordField(element) {
  return element instanceof HTMLInputElement && (isPasswordInputField(element) || managedPasswordInputs.has(element));
}

function setElementValue(element, value) {
  const prototype = HTMLInputElement.prototype;
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

function initializePasswordToggles() {
  installPasswordTogglesForRoot(document);
  observeRoot(document);
}

function observeRoot(root) {
  if (!root || observedRoots.has(root)) {
    return;
  }

  observedRoots.add(root);

  const observer = new MutationObserver((mutations) => {
    let requiresReposition = false;

    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLInputElement) {
        const input = mutation.target;
        if (isPasswordInputField(input)) {
          ensurePasswordToggleForField(input);
        } else if (passwordToggleRegistry.has(input) && passwordToggleRegistry.get(input)?.dataset.visible !== "true") {
          removePasswordToggleForField(input);
        }
        requiresReposition = true;
      }

      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof ShadowRoot) {
            installPasswordTogglesForRoot(node);
            requiresReposition = true;
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node instanceof Element) {
            removePasswordTogglesForRemovedSubtree(node);
            requiresReposition = true;
          }
        });
      }
    }

    if (requiresReposition) {
      positionAllPasswordToggles();
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["type", "class", "style", "readonly", "disabled"]
  });
}

function installPasswordTogglesForRoot(root) {
  if (!(root instanceof Element || root instanceof Document || root instanceof ShadowRoot)) {
    return;
  }

  if (root instanceof HTMLInputElement && isPasswordInputField(root)) {
    ensurePasswordToggleForField(root);
  }

  if (root.querySelectorAll) {
    root.querySelectorAll("input[type='password']").forEach((input) => {
      if (isPasswordInputField(input)) {
        ensurePasswordToggleForField(input);
      }
    });

    root.querySelectorAll("*").forEach((element) => {
      if (element.shadowRoot) {
        installPasswordTogglesForRoot(element.shadowRoot);
        observeRoot(element.shadowRoot);
      }
    });
  }

  if (root instanceof Element && root.shadowRoot) {
    installPasswordTogglesForRoot(root.shadowRoot);
    observeRoot(root.shadowRoot);
  }

  positionAllPasswordToggles();
}

function ensurePasswordToggleForField(input) {
  if (hasExistingPagePasswordToggle(input)) {
    removePasswordToggleForField(input);
    return;
  }

  if (passwordToggleRegistry.has(input)) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = PASSWORD_TOGGLE_CLASS;
  button.dataset.visible = "false";
  button.setAttribute("aria-label", "Show password");

  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    const currentType = (input.type || "").toLowerCase();
    const shouldShow = currentType === "password";

    input.type = shouldShow ? "text" : "password";
    button.dataset.visible = shouldShow ? "true" : "false";
    button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    updatePasswordTogglePosition(input);
  });

  reserveInputPaddingForToggle(input);
  document.documentElement.appendChild(button);
  passwordToggleRegistry.set(input, button);
  managedPasswordInputs.add(input);
}

function removePasswordToggleForField(input) {
  const button = passwordToggleRegistry.get(input);
  if (!button) {
    return;
  }
  button.remove();
  passwordToggleRegistry.delete(input);
  managedPasswordInputs.delete(input);
}

function removePasswordTogglesForRemovedSubtree(root) {
  if (!(root instanceof Element)) {
    return;
  }

  if (root instanceof HTMLInputElement) {
    removePasswordToggleForField(root);
  }

  root.querySelectorAll("input").forEach((input) => {
    removePasswordToggleForField(input);
  });
}

function positionAllPasswordToggles() {
  Array.from(managedPasswordInputs).forEach((input) => {
    updatePasswordTogglePosition(input);
  });
}

function updatePasswordTogglePosition(input) {
  const button = passwordToggleRegistry.get(input);
  if (!button) {
    return;
  }

  if (!input.isConnected) {
    removePasswordToggleForField(input);
    return;
  }

  if (hasExistingPagePasswordToggle(input)) {
    button.style.display = "none";
    return;
  }

  if (!isVisible(input) || !isManagedPasswordField(input) || !hasPasswordValue(input)) {
    button.style.display = "none";
    return;
  }

  const rect = input.getBoundingClientRect();
  button.style.display = "inline-flex";
  button.style.top = `${window.scrollY + rect.top + Math.max(2, (rect.height - 26) / 2)}px`;
  button.style.left = `${window.scrollX + rect.right - 54}px`;
}

function reserveInputPaddingForToggle(input) {
  const minimumRightPadding = 56;
  const computedPadding = Number.parseFloat(window.getComputedStyle(input).paddingRight || "0");
  if (Number.isNaN(computedPadding) || computedPadding >= minimumRightPadding) {
    return;
  }
  input.style.paddingRight = `${minimumRightPadding}px`;
}

function hasPasswordValue(input) {
  return typeof input.value === "string" && input.value.length > 0;
}

function hasExistingPagePasswordToggle(input) {
  if (!(input instanceof HTMLInputElement)) {
    return false;
  }

  const scopeCandidates = [];
  if (input.parentElement) {
    scopeCandidates.push(input.parentElement);
  }
  const fieldContainer = input.closest("[class*='password'], [class*='input'], [class*='field'], [class*='form-group']");
  if (fieldContainer) {
    scopeCandidates.push(fieldContainer);
  }

  const selectors = [
    "button",
    "[role='button']",
    ".icon",
    "[class*='eye']",
    "[class*='toggle']",
    "[class*='show-password']",
    "[class*='hide-password']",
    "[aria-label]",
    "[title]"
  ];

  return scopeCandidates.some((scope) => {
    const elements = scope.querySelectorAll(selectors.join(","));
    return Array.from(elements).some((el) => {
      if (el.classList?.contains(PASSWORD_TOGGLE_CLASS)) {
        return false;
      }

      const textSignal = [
        el.getAttribute?.("aria-label") || "",
        el.getAttribute?.("title") || "",
        el.className || "",
        el.textContent || ""
      ]
        .join(" ")
        .toLowerCase();

      return /(show|hide|toggle).{0,20}password|password.{0,20}(show|hide|toggle)|eye/.test(textSignal);
    });
  });
}
