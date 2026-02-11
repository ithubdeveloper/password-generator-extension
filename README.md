# Password Generator Pro (Chrome Extension)

A modern Chrome extension that generates strong passwords and autofills them into the active page field.

## Highlights

- Secure password generation with `crypto.getRandomValues`.
- Minimum password length locked to `12` characters.
- Mixed character sets supported: uppercase, lowercase, numbers, and symbols.
- Autofill targets the active editable field first, then falls back to password and password-like fields.
- Framework-friendly autofill events (`input` and `change`) for better compatibility.
- Inline quick action near focused fields: **Use Generated Password**.
- Persistent settings using `chrome.storage.sync`.

## Install (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.

## Usage

1. Open the extension popup.
2. Set length (`12-64`) and character options.
3. Click **Regenerate** to produce a new password.
4. Use:
   - **Copy** to copy password.
   - **Autofill Active Field** to fill the selected page field.
   - **Copy + Autofill** for both actions.

## Notes

- Some restricted pages (such as `chrome://` pages) block content scripts and autofill.
- For best results, click into the field you want to fill before using autofill.

## Tech

- Manifest V3
- Vanilla JavaScript (no jQuery dependency)
- HTML + CSS

## License

MIT. See `LICENSE`.
