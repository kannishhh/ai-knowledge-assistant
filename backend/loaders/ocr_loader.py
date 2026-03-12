from pdf2image import convert_from_path
import pytesseract


def extract_text_from_pdf(pdf_path: str, dpi: int = 200, lang: str = "eng") -> str:
    images = convert_from_path(pdf_path, dpi=dpi)
    text_pages = []

    for img in images:
        text = pytesseract.image_to_string(img, lang=lang) or ""
        text_pages.append(text.strip())

    return "\n\n".join([t for t in text_pages if t])