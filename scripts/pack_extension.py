#!/usr/bin/env python3
"""
PDFImport - Distribution Packaging Script
Creates a clean production ZIP package for Chrome Web Store and Opera Add-ons
according to the distribution rules in docs/Publishing_PLAN.md.
"""

import os
import json
import zipfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(REPO_ROOT, "manifest.json")
DIST_DIR = os.path.join(REPO_ROOT, "dist")

DIST_ITEMS = [
    "manifest.json",
    "src",
    "icons",
    "_locales"
]

def get_extension_version():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("version", "1.0.0")

def pack():
    version = get_extension_version()
    os.makedirs(DIST_DIR, exist_ok=True)
    zip_filename = f"pdfimport-v{version}.zip"
    zip_path = os.path.join(DIST_DIR, zip_filename)

    print(f"Packaging PDFImport version {version}...")
    file_count = 0

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in DIST_ITEMS:
            item_path = os.path.join(REPO_ROOT, item)
            if not os.path.exists(item_path):
                print(f"Warning: Item {item} does not exist at {item_path}")
                continue

            if os.path.isfile(item_path):
                zf.write(item_path, arcname=item)
                print(f"  Added file: {item}")
                file_count += 1
            elif os.path.isdir(item_path):
                for root, _, files in os.walk(item_path):
                    for file in sorted(files):
                        abs_file = os.path.join(root, file)
                        rel_file = os.path.relpath(abs_file, REPO_ROOT)
                        zf.write(abs_file, arcname=rel_file.replace(os.sep, "/"))
                        print(f"  Added file: {rel_file.replace(os.sep, '/')}")
                        file_count += 1

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"\nPackage created successfully:")
    print(f"  Destination: {zip_path}")
    print(f"  Total files: {file_count}")
    print(f"  Size: {size_kb:.2f} KB")

if __name__ == "__main__":
    pack()
