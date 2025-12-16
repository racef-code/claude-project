# Quick Start Guide

Get your Virtual Try-On MVP running in 5 minutes!

## Prerequisites

- Python 3.8 or higher
- A Google API key ([Get one here](https://aistudio.google.com/app/apikey))

## Setup Steps

### 1. Install Dependencies

```bash
cd vto-mvp
pip install -r requirements.txt
```

### 2. Configure API Key

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# GOOGLE_API_KEY=your_actual_api_key_here
```

### 3. (Optional) Create Placeholder Images

```bash
python create_placeholders.py
```

Or add your own garment images to `static/catalog/`:
- `item_001.jpg` - Linen Blazer
- `item_002.jpg` - Cotton Tee
- `item_003.jpg` - Denim Jacket

### 4. Verify Setup

```bash
python check_setup.py
```

### 5. Run the App

```bash
python app.py
```

Visit **http://localhost:5000** in your browser.

## First Try-On

1. Click "Try It On" on any garment
2. Upload a photo of yourself (selfie or full-body)
3. Click "Generate Try-On"
4. Wait 10-20 seconds
5. See yourself wearing the garment!

## Troubleshooting

**"GOOGLE_API_KEY not configured"**
- Make sure you created the `.env` file and added your API key
- Restart the Flask server after adding the key

**Images not showing**
- Run `python create_placeholders.py` to create placeholder images
- Or add your own images to `static/catalog/`

**Generation taking too long**
- First request may take longer (cold start)
- Typical generation time: 10-30 seconds
- Check your internet connection

## Next Steps

- Customize `catalog.json` with your own items
- Replace placeholder images with real garment photos
- Adjust AI prompts for better results
- Customize styling in `static/css/style.css`

## Need Help?

See [README.md](README.md) for full documentation.
