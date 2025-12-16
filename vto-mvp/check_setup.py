#!/usr/bin/env python3
"""
Check if the VTO MVP is properly set up
"""
import os
import sys
import json

def check_file(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description} MISSING: {filepath}")
        return False

def check_env():
    """Check .env file and API key"""
    if not os.path.exists('.env'):
        print("✗ .env file MISSING")
        print("  → Create .env file with your GOOGLE_API_KEY")
        print("  → cp .env.example .env")
        return False

    with open('.env', 'r') as f:
        content = f.read()
        if 'your_api_key_here' in content or 'GOOGLE_API_KEY=' not in content:
            print("✗ GOOGLE_API_KEY not configured in .env")
            print("  → Add your actual API key to .env")
            return False

    print("✓ .env file exists with API key configured")
    return True

def check_catalog_images():
    """Check if catalog images exist"""
    catalog_path = 'static/catalog'
    required_images = ['item_001.jpg', 'item_002.jpg', 'item_003.jpg']

    missing = []
    for img in required_images:
        path = os.path.join(catalog_path, img)
        if os.path.exists(path):
            print(f"✓ Catalog image: {img}")
        else:
            print(f"⚠ Catalog image missing: {img} (will show placeholder)")
            missing.append(img)

    if missing:
        print("\n  ℹ️  To add images:")
        print("     1. Add your garment photos to static/catalog/")
        print("     2. Or run: python create_placeholders.py")
        return False
    return True

def check_dependencies():
    """Check if Python dependencies are installed"""
    try:
        import flask
        print("✓ Flask installed")
    except ImportError:
        print("✗ Flask NOT installed")
        print("  → Run: pip install -r requirements.txt")
        return False

    try:
        import google.generativeai
        print("✓ google-generativeai installed")
    except ImportError:
        print("✗ google-generativeai NOT installed")
        print("  → Run: pip install -r requirements.txt")
        return False

    try:
        import PIL
        print("✓ Pillow installed")
    except ImportError:
        print("✗ Pillow NOT installed")
        print("  → Run: pip install -r requirements.txt")
        return False

    try:
        import dotenv
        print("✓ python-dotenv installed")
    except ImportError:
        print("✗ python-dotenv NOT installed")
        print("  → Run: pip install -r requirements.txt")
        return False

    return True

def main():
    print("=" * 60)
    print("Virtual Try-On MVP - Setup Check")
    print("=" * 60)
    print()

    checks = []

    print("1. Checking project structure...")
    print("-" * 60)
    checks.append(check_file('app.py', 'Main application'))
    checks.append(check_file('catalog.json', 'Catalog data'))
    checks.append(check_file('requirements.txt', 'Requirements'))
    checks.append(check_file('templates/index.html', 'HTML template'))
    checks.append(check_file('static/css/style.css', 'CSS stylesheet'))
    checks.append(check_file('static/js/main.js', 'JavaScript'))
    print()

    print("2. Checking Python dependencies...")
    print("-" * 60)
    deps_ok = check_dependencies()
    checks.append(deps_ok)
    print()

    print("3. Checking environment configuration...")
    print("-" * 60)
    env_ok = check_env()
    checks.append(env_ok)
    print()

    print("4. Checking catalog images...")
    print("-" * 60)
    images_ok = check_catalog_images()
    print()

    print("=" * 60)
    if all(checks):
        print("✓ Setup complete! You're ready to run the app.")
        print()
        print("To start the server:")
        print("  python app.py")
        print()
        print("Then visit: http://localhost:5000")
        if not images_ok:
            print()
            print("⚠️  Note: Catalog images are missing but the app will work.")
            print("   Add images to static/catalog/ for best results.")
    else:
        print("✗ Setup incomplete. Please fix the issues above.")
        print()
        print("Quick start:")
        print("  1. pip install -r requirements.txt")
        print("  2. cp .env.example .env")
        print("  3. Edit .env and add your GOOGLE_API_KEY")
        print("  4. python create_placeholders.py (optional)")
        print("  5. python app.py")
        sys.exit(1)

    print("=" * 60)

if __name__ == '__main__':
    main()
