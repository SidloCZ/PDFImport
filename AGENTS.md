# Project Development and Design Guidelines

- **Less is sometimes more**: Prioritise simplicity, clarity and restraint over clutter.
- **No emojis**: Strictly avoid using emojis throughout the entire project (user interface, context menus, toast notifications, buttons, code, logos, commit messages).
- SVG icons instead of emojis: simple clean, symbols look better than emojis and can be used sparingly in the app.
- **Simple style**: Adhere to a clean, minimalist, functional and professional design without visual clutter.
- Language: Main language of extension and github readme is English, secondary is Czech (if browser is in czech, use czech)
- Update README.md: After significant changes to the extension, update readme. Update all language versions of README accordingly.
- **Automatic version bumping (SemVer)**: Automatically increment extension version in `manifest.json` (and keep `debug-extension/manifest.json`, fallback constants, and READMEs in sync) based on the magnitude of changes:
  - **PATCH** (`x.y.Z+1`): Bug fixes, styling tweaks, minor text/translation adjustments, or internal refactoring.
  - **MINOR** (`x.Y+1.0`): New features, new AI platform support, new UI components/settings, or significant functional improvements.
  - **MAJOR** (`X+1.0.0`): Breaking changes, major architectural overhauls, or fundamental workflow redesigns.
- After every msg in chat, include a commit message based on latest changes.
