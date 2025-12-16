#!/usr/bin/env python3
"""
Create placeholder images for the catalog
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_placeholder(filename, color, text):
    """Create a placeholder image with solid color and text"""
    width, height = 600, 800
    img = Image.new('RGB', (width, height), color=color)
    draw = ImageDraw.Draw(img)

    # Try to use a default font, fallback to basic font if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
    except:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw text in the center
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (width - text_width) // 2
    y = (height - text_height) // 2

    # Draw shadow for better visibility
    shadow_offset = 3
    draw.text((x + shadow_offset, y + shadow_offset), text, fill=(0, 0, 0, 128), font=font)
    draw.text((x, y), text, fill='white', font=font)

    # Add "Placeholder" text at bottom
    placeholder_text = "Placeholder Image"
    bbox2 = draw.textbbox((0, 0), placeholder_text, font=font_small)
    text_width2 = bbox2[2] - bbox2[0]
    x2 = (width - text_width2) // 2
    y2 = height - 100

    draw.text((x2 + 2, y2 + 2), placeholder_text, fill=(0, 0, 0, 128), font=font_small)
    draw.text((x2, y2), placeholder_text, fill='white', font=font_small)

    # Save the image
    output_path = os.path.join('static', 'catalog', filename)
    img.save(output_path, 'JPEG', quality=85)
    print(f"Created: {output_path}")

if __name__ == '__main__':
    # Make sure the catalog directory exists
    os.makedirs('static/catalog', exist_ok=True)

    # Create three placeholder images
    create_placeholder('item_001.jpg', '#D4A574', 'Linen\nBlazer')  # Sand beige
    create_placeholder('item_002.jpg', '#F5F5DC', 'Cotton\nTee')    # Off-white/cream
    create_placeholder('item_003.jpg', '#4682B4', 'Denim\nJacket')  # Medium blue

    print("\nPlaceholder images created successfully!")
    print("You can replace these with your actual garment photos later.")
