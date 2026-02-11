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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS).then((settings) => {
    chrome.storage.sync.set({
      ...DEFAULT_SETTINGS,
      ...settings,
      length: clampLength(settings.length)
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generatePassword") {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((settings) => {
      sendResponse({ password: generatePassword(settings) });
    }).catch(() => {
      sendResponse({ password: generatePassword(DEFAULT_SETTINGS) });
    });

    return true;
  }

  return undefined;
});

function generatePassword(settings) {
  const normalized = {
    length: clampLength(settings.length),
    uppercase: Boolean(settings.uppercase),
    lowercase: Boolean(settings.lowercase),
    numbers: Boolean(settings.numbers),
    symbols: Boolean(settings.symbols)
  };

  const pools = [];
  if (normalized.uppercase) {
    pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  }
  if (normalized.lowercase) {
    pools.push("abcdefghijklmnopqrstuvwxyz");
  }
  if (normalized.numbers) {
    pools.push("0123456789");
  }
  if (normalized.symbols) {
    pools.push(SYMBOLS);
  }

  if (pools.length === 0) {
    pools.push("abcdefghijklmnopqrstuvwxyz");
  }

  const chars = pools.map((pool) => pool[randomInt(pool.length)]);
  const all = pools.join("");

  while (chars.length < normalized.length) {
    chars.push(all[randomInt(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    throw new Error("Invalid random range");
  }

  const maxUint32 = 0xFFFFFFFF;
  const threshold = maxUint32 - ((maxUint32 + 1) % maxExclusive);
  const randomValues = new Uint32Array(1);

  do {
    crypto.getRandomValues(randomValues);
  } while (randomValues[0] > threshold);

  return randomValues[0] % maxExclusive;
}

function clampLength(length) {
  const parsed = Number.parseInt(length, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SETTINGS.length;
  }

  return Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, parsed));
}
