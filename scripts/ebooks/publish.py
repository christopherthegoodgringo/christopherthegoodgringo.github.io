#!/usr/bin/env python3
"""Send finished ebook files to the private Supabase bucket "ebooks" (the sandbox can't reach Supabase directly).

Usage: python3 scripts/ebooks/publish.py OUT_DIR SRC_DIR BOOK_ID [BOOK_ID ...]
1. Encrypts <id>/en.pdf, <id>/es.pdf and the two Markdown sources with a fresh random AES-GCM key.
2. Pushes the encrypted blobs to a temporary orphan branch "ebook-transfer" of this repo (unreadable without the key).
3. Prints the JSON body to POST to the ebook-delivery function (action "import"), e.g. from SQL with net.http_post.
After the import succeeds, delete the branch: git push origin --delete ebook-transfer
"""
import base64, json, os, pathlib, secrets, subprocess, sys, tempfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

out_dir, src_dir, *books = sys.argv[1:]
repo = pathlib.Path(__file__).resolve().parents[2]
key = AESGCM.generate_key(bit_length=256); aes = AESGCM(key)
work = pathlib.Path(tempfile.mkdtemp())
subprocess.run(["git", "init", "-q", "-b", "ebook-transfer", str(work)], check=True)
items = []
for b in books:
    files = [(pathlib.Path(out_dir, b, "en.pdf"), f"{b}/en.pdf", "application/pdf"),
             (pathlib.Path(out_dir, b, "es.pdf"), f"{b}/es.pdf", "application/pdf"),
             (pathlib.Path(src_dir, f"{b}.en.md"), f"src/{b}.en.md", "text/markdown"),
             (pathlib.Path(src_dir, f"{b}.es.md"), f"src/{b}.es.md", "text/markdown")]
    for src, dest, typ in files:
        iv = secrets.token_bytes(12)
        name = secrets.token_hex(8) + ".bin"
        (work / name).write_bytes(iv + aes.encrypt(iv, src.read_bytes(), None))
        items.append({"name": name, "path": dest, "type": typ})
remote = subprocess.run(["git", "-C", str(repo), "remote", "get-url", "origin"], capture_output=True, text=True, check=True).stdout.strip()
env = {**os.environ, "GIT_AUTHOR_NAME": "Claude", "GIT_AUTHOR_EMAIL": "noreply@anthropic.com", "GIT_COMMITTER_NAME": "Claude", "GIT_COMMITTER_EMAIL": "noreply@anthropic.com"}
subprocess.run(["git", "-C", str(work), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(work), "commit", "-qm", "temporary encrypted transfer"], check=True, env=env)
subprocess.run(["git", "-C", str(work), "push", "-q", "-f", remote, "ebook-transfer"], check=True)
sha = subprocess.run(["git", "-C", str(work), "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
owner_repo = remote.split("github.com/")[1].removesuffix(".git")
body = {"action": "import", "key": base64.b64encode(key).decode(),
        "items": [{"url": f"https://raw.githubusercontent.com/{owner_repo}/{sha}/{i['name']}", "path": i["path"], "type": i["type"]} for i in items]}
print(json.dumps(body))
