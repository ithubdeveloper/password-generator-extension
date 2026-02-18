# Password Generator Pro - Chrome Password Generator Extension

Password Generator Pro is a Chrome extension for secure password generation, password autofill, and password visibility toggle support on web forms.

## Highlights

- Secure password generation with `crypto.getRandomValues`.
- Minimum password length locked to `12` characters.
- Mixed character sets supported: uppercase, lowercase, numbers, and symbols.
- Autofill targets password fields only.
- Framework-friendly autofill events (`input` and `change`) for better compatibility.
- Inline quick action near focused password fields: **Use Generated Password**.
- Password eye toggle on page password fields (only shown when the field has a value).
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

## SEO Keywords

Use these keywords in your Chrome Web Store listing and repository description/topics:

- chrome password generator
- secure password generator extension
- password autofill chrome extension
- password visibility toggle
- strong password creator
- random password generator

## Chrome Web Store SEO Pack

See `/Users/saqib/Github/password-generator-extension/docs/chrome-web-store-seo.md` for ready-to-use:

- SEO title ideas
- short description
- long description
- keyword list
- publish checklist

## License

MIT. See `LICENSE`.
