import fitz

doc = fitz.open('C:/Users/admin/Desktop/Medical Headlights Brochure.pdf')
print(f'Total pages: {doc.page_count}')
print()

for i, page in enumerate(doc):
    text = page.get_text()
    if text.strip():
        print(f'=== Page {i+1} ===')
        print(text)
        print()