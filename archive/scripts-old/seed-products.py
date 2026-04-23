#!/usr/bin/env python3
"""
Import all products from CSV into Vendure.
Run: python3 seed-products.py
"""

import requests, json, re, sys, os, tempfile, csv, time

VENDURE_URL     = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER      = "superadmin"
ADMIN_PASS      = "2supe1r23ad1mi3F"
TAX_CATEGORY_ID = "43"

INV_CSV = "_INVENTARIOS B - Base de datos.csv"
IMG_CSV = "_INVENTARIOS B - imagenes.csv"

session = requests.Session()

def gql(query, variables=None):
    r = session.post(VENDURE_URL, json={"query": query, "variables": variables or {}})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL: {data['errors'][0]['message']}")
    return data["data"]

def login():
    r = gql("""mutation L($u:String!,$p:String!){
        login(username:$u,password:$p){
            ...on CurrentUser{id identifier}
            ...on ErrorResult{errorCode message}
        }
    }""", {"u": ADMIN_USER, "p": ADMIN_PASS})
    if "errorCode" in r["login"]:
        raise RuntimeError(r["login"]["message"])
    print(f"✓ Logged in as {r['login']['identifier']}")

def parse_price(raw):
    """Parse COP price like '159.003,00' → 159003"""
    raw = raw.strip().replace(" ", "")
    if not raw:
        return 0
    raw = re.sub(r'\.(?=\d{3}[,\.])', '', raw)  # remove thousands dots
    raw = raw.replace(',', '.')                   # decimal comma → dot
    try:
        return int(float(raw))
    except ValueError:
        return 0

def load_inventory():
    products = {}
    with open(INV_CSV, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    # Find header row
    header_row = next(i for i, r in enumerate(rows) if r and r[0].strip().upper().startswith('CODIGO'))
    for row in rows[header_row + 1:]:
        if not row or not row[0].strip():
            continue
        sku   = row[0].strip()
        name  = row[2].strip() if len(row) > 2 else ""
        price = parse_price(row[7]) if len(row) > 7 else 0
        if not name or price <= 0:
            continue
        products[sku] = {"sku": sku, "name": name, "price": price}
    return products

def load_images():
    images = {}
    with open(IMG_CSV, encoding="utf-8-sig") as f:
        for row in csv.reader(f):
            if len(row) < 3:
                continue
            sku, url = row[0].strip(), row[2].strip()
            if sku and "drive.google.com" in url:
                m = re.search(r'id=([A-Za-z0-9_\-]+)', url)
                if m:
                    images[sku] = m.group(1)
    return images

def download_image(drive_id, sku):
    url = f"https://drive.google.com/uc?export=download&id={drive_id}"
    s = requests.Session()
    r = s.get(url, stream=True, timeout=30)
    if "download_warning" in r.url or b"confirm" in r.content[:500]:
        token = re.search(r'confirm=([0-9A-Za-z_\-]+)', r.text)
        if token:
            r = s.get(f"{url}&confirm={token.group(1)}", stream=True, timeout=30)
    if r.status_code != 200 or len(r.content) < 2000:
        return None
    ct = r.headers.get("Content-Type", "image/jpeg")
    ext = "jpg" if "jpeg" in ct else ct.split("/")[-1].split(";")[0].strip()
    safe_sku = re.sub(r'[^A-Za-z0-9_\-]', '_', sku)
    path = os.path.join(tempfile.gettempdir(), f"{safe_sku}.{ext}")
    with open(path, "wb") as f:
        f.write(r.content)
    return path, ext

def upload_asset(filepath, filename):
    with open(filepath, "rb") as f:
        content = f.read()
    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
    # Resize large images to avoid 413
    if len(content) > 3_000_000:
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content))
            img.thumbnail((1200, 1200))
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=80)
            content = buf.getvalue()
            mime = 'image/jpeg'
            filename = filename.rsplit('.', 1)[0] + '.jpg'
        except Exception:
            pass  # upload as-is if PIL not available
    r = session.post(
        VENDURE_URL,
        data={
            "operations": json.dumps({
                "query": """mutation CA($file:Upload!){
                    createAssets(input:[{file:$file}]){
                        ...on Asset{id name}
                        ...on ErrorResult{errorCode message}
                    }
                }""",
                "variables": {"file": None},
            }),
            "map": json.dumps({"0": ["variables.file"]}),
        },
        files={"0": (filename, content, mime)},
    )
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(f"Upload error: {data['errors']}")
    asset = data["data"]["createAssets"][0]
    if "errorCode" in asset:
        raise RuntimeError(f"Asset error: {asset['message']}")
    return asset["id"]

def sku_exists(sku):
    r = gql("""query C($sku:String!){
        productVariants(options:{filter:{sku:{eq:$sku}}}){totalItems}
    }""", {"sku": sku})
    return r["productVariants"]["totalItems"] > 0

def create_product(p, asset_id):
    slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
    slug = f"{slug}-{re.sub(r'[^a-z0-9]', '', p['sku'].lower())}"
    prod = gql("""mutation CP($input:CreateProductInput!){
        createProduct(input:$input){id}
    }""", {"input": {
        "translations": [{"languageCode": "es", "name": p["name"], "slug": slug, "description": ""}],
        "assetIds":        [asset_id] if asset_id else [],
        "featuredAssetId": asset_id,
    }})
    pid = prod["createProduct"]["id"]
    gql("""mutation CV($input:[CreateProductVariantInput!]!){
        createProductVariants(input:$input){id}
    }""", {"input": [{
        "productId":       pid,
        "sku":             p["sku"],
        "price":           p["price"],
        "taxCategoryId":   TAX_CATEGORY_ID,
        "translations":    [{"languageCode": "es", "name": p["name"]}],
        "assetIds":        [asset_id] if asset_id else [],
        "featuredAssetId": asset_id,
        "stockOnHand":     0,
        "trackInventory":  "FALSE",
    }]})
    return pid

def main():
    login()
    inventory = load_inventory()
    images    = load_images()
    print(f"Inventory: {len(inventory)} products | Images: {len(images)} with photos")

    skus = list(inventory.keys())
    created = skipped = failed = no_image = 0

    for i, sku in enumerate(skus, 1):
        p = inventory[sku]
        prefix = f"[{i}/{len(skus)}] {sku}"

        if sku_exists(sku):
            print(f"  {prefix} — SKIP (exists)")
            skipped += 1
            continue

        # Image
        asset_id = None
        drive_id = images.get(sku)
        if drive_id:
            try:
                result = download_image(drive_id, sku)
                if result:
                    path, ext = result
                    asset_id = upload_asset(path, f"{sku}.{ext}")
                    os.remove(path)
            except Exception as e:
                print(f"  {prefix} — image failed: {e}")
        else:
            no_image += 1

        try:
            create_product(p, asset_id)
            img_icon = "📷" if asset_id else "—"
            print(f"  {prefix} ✓  ${p['price']:,}  {img_icon}  {p['name'][:40]}")
            created += 1
        except Exception as e:
            print(f"  {prefix} ✗ FAILED: {e}")
            failed += 1

        # Small delay every 50 products to avoid overwhelming the server
        if i % 50 == 0:
            time.sleep(2)

    print(f"\n{'═'*60}")
    print(f"  Created: {created}  |  Skipped: {skipped}  |  Failed: {failed}  |  No image: {no_image}")
    print(f"{'═'*60}")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
