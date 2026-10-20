"""Build a shareable 12-page PDF from presentation-tool slide renders."""

from pathlib import Path
from PIL import Image
import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("render_dir", type=Path)
    parser.add_argument("output_pdf", type=Path)
    args = parser.parse_args()

    pages = sorted(args.render_dir.glob("slide-*.png"), key=lambda p: int(p.stem.split("-")[1]))
    if len(pages) != 12:
        raise SystemExit(f"Expected 12 slide images, found {len(pages)}")
    images = []
    try:
        for page in pages:
            with Image.open(page) as image:
                images.append(image.convert("RGB"))
        args.output_pdf.parent.mkdir(parents=True, exist_ok=True)
        images[0].save(args.output_pdf, "PDF", save_all=True, append_images=images[1:], resolution=120)
    finally:
        for image in images:
            image.close()
    print(f"Wrote {args.output_pdf} ({len(pages)} pages)")


if __name__ == "__main__":
    main()
