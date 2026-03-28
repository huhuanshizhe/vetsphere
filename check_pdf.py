import fitz

doc = fitz.open('C:/Users/admin/Desktop/Medical Headlights Brochure.pdf')
print(f'Pages: {doc.page_count}')
print()

for i, page in enumerate(doc):
    text = page.get_text()
    images = page.get_images()
    print(f'Page {i+1}: text={len(text)} chars, images={len(images)}')
    
    if text.strip():
        print(f'  Text preview: {text[:200]}...')
    
    # Get text blocks
    blocks = page.get_text('blocks')
    if blocks:
        print(f'  Blocks: {len(blocks)}')
        for b in blocks[:3]:
            if len(b) > 4 and b[4]:
                print(f'    - {b[4][:100]}...')
    print()