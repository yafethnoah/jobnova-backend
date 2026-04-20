# Fast install notes

This backend was adjusted so optional OCR packages do not block the main install.

Default install:
```bash
cd backend
npm install --no-optional --no-audit --no-fund
```

If you later need OCR, install the optional packages manually:
```bash
npm install @google-cloud/vision tesseract.js
```
