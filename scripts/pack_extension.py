#!/usr/bin/env python3
"""
PDFImport - Multi-Browser Packaging Script
Builds tailored distribution ZIP packages for Chrome, Opera, Edge, and Firefox
according to the distribution guidelines.
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

SUPPORTED_BROWSERS = ["chrome", "opera", "edge", "firefox"]

DIST_ITEMS = [
    "manifest.json",
    "src",
    "icons",
    "_locales"
]

def get_base_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_extension_version():
    data = get_base_manifest()
    return data.get("version", "1.0.0")

def customize_manifest(base_manifest, browser):
    """
    Applies browser-specific manifest adjustments.
    - Chromium browsers (Chrome, Opera, Edge) share the standard Manifest V3 specification.
    - Firefox requires browser_specific_settings.gecko.id, background scripts instead of service worker,
      and omits the Chromium-specific 'offscreen' permission.
    """
    manifest = json.loads(json.dumps(base_manifest))

    if browser == "firefox":
        # Firefox requires gecko ID in browser_specific_settings
        manifest["browser_specific_settings"] = {
            "gecko": {
                "id": "pdfimport@sidlocz.github.io",
                "strict_min_version": "109.0"
            }
        }

        # Firefox uses background.scripts for MV3 event pages
        manifest["background"] = {
            "scripts": ["src/background.js"]
        }

        # Firefox does not support 'offscreen' API
        if "permissions" in manifest and "offscreen" in manifest["permissions"]:
            manifest["permissions"] = [p for p in manifest["permissions"] if p != "offscreen"]

    elif browser == "edge":
        # Standard Chromium MV3; fully compatible with Microsoft Edge Add-ons
        pass

    elif browser == "opera":
        # Standard Chromium MV3; fully compatible with Opera Add-ons
        pass

    elif browser == "chrome":
        # Standard Chromium MV3 for Chrome Web Store
        pass

    return manifest

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

def pack_browser(browser, version, base_manifest):
    browser_dist_dir = os.path.join(DIST_DIR, browser)
    os.makedirs(browser_dist_dir, exist_ok=True)

    zip_filename_typed = f"pdfimport-v{version}-{browser}.zip"
    zip_filename_generic = f"pdfimport-v{version}.zip"

    zip_path_typed = os.path.join(browser_dist_dir, zip_filename_typed)
    zip_path_generic = os.path.join(browser_dist_dir, zip_filename_generic)

    manifest_data = customize_manifest(base_manifest, browser)
    manifest_bytes = json.dumps(manifest_data, indent=2, ensure_ascii=False).encode("utf-8")

    print(f"\nPackaging PDFImport v{version} for [{browser.upper()}]...")
    file_count = 0

    with zipfile.ZipFile(zip_path_typed, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write tailored manifest
        zf.writestr("manifest.json", manifest_bytes)
        file_count += 1
        print("  Added: manifest.json (customized)")

        # Write remaining items
        for item in DIST_ITEMS:
            if item == "manifest.json":
                continue

            item_path = os.path.join(REPO_ROOT, item)
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
                        rel_file = os.path.relpath(abs_file, REPO_ROOT).replace(os.sep, "/")

                        # Skip offscreen document files in Firefox package
                        if browser == "firefox" and rel_file.startswith("src/offscreen"):
                            continue

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

    base_manifest = get_base_manifest()
    version = base_manifest.get("version", "1.0.0")

    targets = SUPPORTED_BROWSERS if args.target == "all" else [args.target]

    print("=" * 60)
    print(f"PDFImport Multi-Browser Package Builder (v{version})")
    print(f"Targets: {', '.join(targets)}")
    print("=" * 60)

    results = []
    for browser in targets:
        res = pack_browser(browser, version, base_manifest)
        results.append(res)

    print("\n" + "=" * 60)
    print("Packaging Summary:")
    print("=" * 60)
    for r in results:
        print(f"  [{r['browser'].upper():<8}] {r['size_kb']:>8.2f} KB  ({r['files']} files) -> dist/{r['browser']}/")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
