# Chrome Web Store Submission Pack

This document contains the details you need to submit this extension to the Chrome Web Store.

## 1) Package to Upload

From the project root, create a zip of the extension files:

```bash
cd /Users/saqib/Github/password-generator-extension
zip -r password-generator-pro-v2.0.0.zip . -x "*.git*" "docs/*" "*.DS_Store"
```

Upload the generated zip in the Developer Dashboard.

## 2) Store Listing Details

Use the following values:

- Extension name: `Password Generator Pro`
- Category: `Productivity`
- Language: `English`

### Short Description (recommended)

Generate strong passwords, autofill password fields, and quickly show or hide passwords with an eye toggle.

### Detailed Description (recommended)

Password Generator Pro helps you create secure passwords and use them instantly in website password fields.

Features:

- Strong random password generation with secure browser crypto APIs
- Length and character options (uppercase, lowercase, numbers, symbols)
- One-click copy and autofill for password fields
- Inline quick-fill action near focused password fields
- Password eye toggle for show/hide on password inputs
- Settings saved with Chrome sync storage
- Compatible with modern frameworks through `input` and `change` events

## 3) Privacy and Data Disclosure

Use these settings in Privacy tab:

- Personal data sold: `No`
- Personal data used outside core functionality: `No`
- Data collection: `No user data collected`
- Authentication required: `No`

### Privacy policy URL

You need a public URL. Publish `SECURITY.md` on GitHub Pages or a website, then place that URL in the store form.

## 4) Permission Justification

Use this text for reviewer notes:

- `storage`: saves password generation preferences locally/synced to the user browser account.
- `activeTab`: allows filling a password into the current active tab only when user triggers autofill.
- `scripting`: executes autofill fallback script in the active tab when needed.
- Host access (`<all_urls>` via content script): needed to detect password fields and provide in-page quick-fill and eye-toggle behaviors on websites.

## 5) Single Purpose Statement

Use this in the submission form:

Password Generator Pro generates secure passwords and helps users autofill and manage visibility of password fields directly on websites.

## 6) Screenshots for Store Listing

Store-safe screenshot requirements:

- Format: PNG or JPEG
- Size: minimum `1280x800`, maximum `3840x2160`
- Recommended count: 3 to 5 screenshots

Current repository screenshot templates:

- `docs/screenshots/01-popup-overview.png`
- `docs/screenshots/02-autofill-password-field.png`
- `docs/screenshots/03-eye-toggle.png`

Replace these template images with real screenshots before publishing.

## 7) Final Pre-Submit Checklist

- Extension loads and runs without console errors.
- Version in `manifest.json` matches release.
- Description text in store matches actual behavior.
- Privacy policy URL is publicly accessible.
- Screenshots are real product screenshots.
- Submit for review.
