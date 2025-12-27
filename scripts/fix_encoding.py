"""Utility to repair mojibake sequences in HTML files."""
from __future__ import annotations

from pathlib import Path


def _try_decode(chunk: str) -> str | None:
    """Return chunk decoded from mojibake if possible."""
    for encoding in ("cp1252", "latin1"):
        try:
            raw = chunk.encode(encoding)
        except UnicodeEncodeError:
            continue
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            continue
    return None


SPECIAL_SEQUENCES: dict[str, str] = {
    "â\x9dŒ": "❌",
}


def fix_text(text: str) -> str:
    """Decode UTF-8 bytes that were misread as Windows-1252."""
    result: list[str] = []
    i = 0
    n = len(text)

    while i < n:
        replaced = False

        if i + 3 <= n:
            chunk3 = text[i : i + 3]
            replacement = SPECIAL_SEQUENCES.get(chunk3)
            if replacement:
                result.append(replacement)
                i += 3
                continue

        if i + 1 < n:
            chunk2 = text[i : i + 2]
            if "Ã" in chunk2 or "Â" in chunk2:
                decoded2 = _try_decode(chunk2)
                if decoded2:
                    result.append(decoded2)
                    i += 2
                    replaced = True

        if replaced:
            continue

        if i + 2 < n:
            chunk3 = text[i : i + 3]
            if any(ch in chunk3 for ch in ("â", "ï")):
                decoded3 = _try_decode(chunk3)
                if decoded3:
                    result.append(decoded3)
                    i += 3
                    continue

        result.append(text[i])
        i += 1

    return "".join(result)


def main() -> None:
    root = Path(".")
    targets = sorted(root.rglob("*.html"))

    for path in targets:
        original = path.read_text(encoding="utf-8")
        fixed = fix_text(original)
        if fixed != original:
            path.write_text(fixed, encoding="utf-8")
            print(f"Fixed mojibake in {path}")


if __name__ == "__main__":
    main()
