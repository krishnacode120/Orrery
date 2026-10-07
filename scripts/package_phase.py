"""Package complete runnable source, assets, docs and verification without local data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256

root = Path(__file__).resolve().parents[1]
output = root / "artifacts"
output.mkdir(exist_ok=True)
files = [root / name for name in (
    ".gitignore", "index.html", "package.json", "package-lock.json",
    "vite.config.js", "README.md", "VERIFICATION.md")]
text_suffixes = {".js", ".jsx", ".py", ".txt", ".json", ".md", ".mjs", ".css", ".html", ".yml", ".yaml"}
for directory in ("src", "backend", "scripts", "docs", "public", ".github"):
    files += [p for p in (root / directory).rglob("*")
              if p.is_file() and "__pycache__" not in p.parts
              and (p.suffix in text_suffixes or directory == "public" or p.suffix in {".png", ".jpg"})]
files = sorted(set(files), key=lambda p: p.relative_to(root).as_posix())
manifest = [p.relative_to(root).as_posix() for p in files]
hashes = "\n".join(f"{sha256(p.read_bytes()).hexdigest()}  {name}"
                   for p, name in zip(files, manifest)) + "\n"
parts = ["# Orrery — full project source\n\n",
         "Complete frontend, backend, tests, configuration, run instructions and documentation. "
         "The accompanying ZIP includes every binary texture at its original relative path.\n\n",
         "## File tree\n\n```text\n", "\n".join(manifest), "\n```\n\n"]
languages = {".jsx": "jsx", ".js": "javascript", ".mjs": "javascript",
             ".py": "python", ".json": "json", ".md": "markdown", ".html": "html"}
for path, name in zip(files, manifest):
    if path.suffix in text_suffixes or path.name == ".gitignore":
        content = path.read_text(encoding="utf-8")
        parts += [f"## {name}\n\n````{languages.get(path.suffix, 'text')}\n",
                  content, "\n````\n\n"]
    else:
        parts += [f"## {name}\n\nBundled binary asset: {path.stat().st_size:,} bytes; "
                  f"SHA-256 `{sha256(path.read_bytes()).hexdigest()}`.\n\n"]
(output / "ORRERY-FULL-SOURCE.md").write_text("".join(parts), encoding="utf-8")
(output / "SHA256SUMS.txt").write_text(hashes, encoding="utf-8")
with ZipFile(output / "orrery-complete.zip", "w", ZIP_DEFLATED) as archive:
    for path, name in zip(files, manifest):
        archive.write(path, f"orrery/{name}")
    archive.writestr("orrery/SHA256SUMS.txt", hashes)
with ZipFile(output / "orrery-complete.zip") as archive:
    assert archive.testzip() is None
    assert len(archive.namelist()) == len(files) + 1
print(f"Packaged and verified {len(files)} complete files in {output}")
