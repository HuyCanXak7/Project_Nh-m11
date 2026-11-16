"""Check local navigation and assets after moving the frontend files."""

import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.links.append(value)


class StaticLinksTests(unittest.TestCase):
    def test_html_links_and_assets_exist(self):
        pages = list(ROOT.rglob("*.html"))
        self.assertTrue(pages)
        for page in pages:
            parser = LinkParser()
            parser.feed(page.read_text(encoding="utf-8"))
            for link in parser.links:
                url = urlsplit(link)
                if url.scheme or url.netloc or not url.path:
                    continue
                path = unquote(url.path)
                target = ROOT / path.lstrip("/") if path.startswith("/") else page.parent / path
                with self.subTest(page=str(page.relative_to(ROOT)), link=link):
                    self.assertTrue(target.resolve().is_relative_to(ROOT))
                    self.assertTrue(target.exists(), f"Missing: {target}")


if __name__ == "__main__":
    unittest.main()
