import fitz
import os

# Create output directory
output_dir = 'e:/连川科技/vetsphere/pdf_images'
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open('C:/Users/admin/Desktop/Medical Headlights Brochure.pdf')
print(f'Extracting images from {doc.page_count} pages...')

for i, page in enumerate(doc):
    images = page.get_images()
    for img_idx, img in enumerate(images):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        # Save image
        img_path = f'{output_dir}/page_{i+1}.{image_ext}'
        with open(img_path, 'wb') as f:
            f.write(image_bytes)
        print(f'Saved: {img_path} ({len(image_bytes)} bytes)')

print(f'\nTotal images extracted to: {output_dir}')