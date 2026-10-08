#!/usr/bin/env python3
"""
PDFImport - Multi-Browser Packaging Script
Builds tailored distribution ZIP packages for Chrome, Opera, Edge, and Firefox.
- Chromium browsers (Chrome, Opera, Edge) are built directly from the pristine repository root.
- Firefox is built from the dedicated, isolated `firefox/` directory to prevent any regressions in Chromium.
"""

import os
import sys
import json
import shutil
import zipfile
import argparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(REPO_ROOT, "manifest.json")
DIST_DIR = os.path.join(REPO_ROOT, "dist")
FIREFOX_ROOT = os.path.join(REPO_ROOT, "firefox")

SUPPORTED_BROWSERS = ["chrome", "opera", "edge", "firefox"]

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

def organize_legacy_dist_files():
    """
    Moves any legacy loose zip files in dist/ into dist/chrome/ to maintain a clean structure.
    """
    if not os.path.exists(DIST_DIR):
        return

    chrome_dir = os.path.join(DIST_DIR, "chrome")
    for item in os.listdir(DIST_DIR):
        item_path = os.path.join(DIST_DIR, item)
        if os.path.isfile(item_path) and item.endswith(".zip"):
            os.makedirs(chrome_dir, exist_ok=True)
            dest_path = os.path.join(chrome_dir, item)
            if not os.path.exists(dest_path):
                shutil.move(item_path, dest_path)
                print(f"Moved legacy archive {item} -> dist/chrome/{item}")
            else:
                os.remove(item_path)

def pack_browser(browser, version):
    browser_dist_dir = os.path.join(DIST_DIR, browser)
    os.makedirs(browser_dist_dir, exist_ok=True)

    zip_filename_typed = f"pdfimport-v{version}-{browser}.zip"
    zip_filename_generic = f"pdfimport-v{version}.zip"

    zip_path_typed = os.path.join(browser_dist_dir, zip_filename_typed)
    zip_path_generic = os.path.join(browser_dist_dir, zip_filename_generic)

    # Determine source directory: Firefox uses its own isolated folder, Chromium uses root
    if browser == "firefox":
        source_root = FIREFOX_ROOT
        if not os.path.exists(source_root):
            raise FileNotFoundError(f"Firefox source directory not found: {source_root}")
    else:
        source_root = REPO_ROOT

    print(f"\nPackaging PDFImport v{version} for [{browser.upper()}] from '{os.path.basename(source_root)}'...")
    file_count = 0

    with zipfile.ZipFile(zip_path_typed, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in DIST_ITEMS:
            item_path = os.path.join(source_root, item)
            if not os.path.exists(item_path):
                print(f"  Warning: Item {item} does not exist at {item_path}")
                continue

            if os.path.isfile(item_path):
                zf.write(item_path, arcname=item)
                file_count += 1
            elif os.path.isdir(item_path):
                for root, _, files in os.walk(item_path):
                    for file in sorted(files):
                        abs_file = os.path.join(root, file)
                        rel_file = os.path.relpath(abs_file, source_root).replace(os.sep, "/")
                        zf.write(abs_file, arcname=rel_file)
                        file_count += 1

    # Also create the generic pdfimport-vX.Y.Z.zip inside the target folder
    shutil.copyfile(zip_path_typed, zip_path_generic)

    size_kb = os.path.getsize(zip_path_typed) / 1024
    print(f"Package created successfully for [{browser.upper()}]:")
    print(f"  Target directory: {browser_dist_dir}")
    print(f"  Files: {zip_filename_typed}, {zip_filename_generic}")
    print(f"  Total packaged items: {file_count}")
    print(f"  Archive size: {size_kb:.2f} KB")

    return {
        "browser": browser,
        "path": zip_path_typed,
        "files": file_count,
        "size_kb": size_kb
    }

def main():
    parser = argparse.ArgumentParser(description="Package PDFImport for Chrome, Opera, Edge, and Firefox.")
    parser.add_argument(
        "--target",
        choices=["all"] + SUPPORTED_BROWSERS,
        default="all",
        help="Target browser package (default: all)"
    )
    args = parser.parse_args()

    organize_legacy_dist_files()

    version = get_extension_version()
    targets = SUPPORTED_BROWSERS if args.target == "all" else [args.target]

    print("=" * 60)
    print(f"PDFImport Multi-Browser Package Builder (v{version})")
    print(f"Targets: {', '.join(targets)}")
    print("=" * 60)

    results = []
    for browser in targets:
        res = pack_browser(browser, version)
        results.append(res)

    print("\n" + "=" * 60)
    print("Packaging Summary:")
    print("=" * 60)
    for r in results:
        print(f"  [{r['browser'].upper():<8}] {r['size_kb']:>8.2f} KB  ({r['files']} files) -> dist/{r['browser']}/")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
