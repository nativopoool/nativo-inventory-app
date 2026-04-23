#!/usr/bin/env python3
"""
Import products from CSV and generate AI images for those without Drive images.
Strategy:
  1. Load inventory from CSV
  2. Load images from Drive CSV
  3. Create products without images → generate with AI
  4. Remove background with Remove.bg
  5. Upload to S3 and Vendure

Run: python3 import-and-generate.py [--limit N] [--no-ai]

Requires environment variables:
- HF_TOKEN (HuggingFace API token)
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- REMOVEBG_API_KEY
"""

import requests, json, re, sys, os, tempfile, csv, time, base64, io, argparse
from PIL import Image

VENDURE_URL = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER = "superadmin"
ADMIN_PASS = "2supe1r23ad1mi3F"
TAX_CATEGORY_ID = "1"
S3_BUCKET = "ferreteriaehogar-images"

AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
REMOVEBG_KEY = os.environ.get("REMOVEBG_API_KEY")
HF_TOKEN = os.environ.get("HF_TOKEN")

INV_CSV = "_INVENTARIOS B - Base de datos.csv"
IMG_CSV = "_INVENTARIOS B - imagenes.csv"

session = requests.Session()

CATEGORY_PROMPTS = {
    "EPP": "Professional product photo of {name}, personal protective equipment, isolated on white background, hardware store catalog style",
    "HERRAMIENTA_MANO": "Professional product photo of {name}, hand tool, isolated on white background, hardware store catalog",
    "ACCESORIOS_CORTE": "Professional product photo of {name}, cutting accessory tool, isolated on white background, hardware store catalog",
    "FERRETERIA_MENOR": "Professional product photo of {name}, hardware fastener, isolated on white background, hardware store catalog",
    "MEDICION": "Professional product photo of {name}, measuring tool, isolated on white background, hardware store catalog",
    "MAQUINARIA": "Professional product photo of {name}, power tool machine, isolated on white background, hardware store catalog",
    "CADENAS_CABLES": "Professional product photo of {name}, chain or cable hardware, isolated on white background",
    "HERRAMIENTA_TALLER": "Professional product photo of {name}, workshop tool, isolated on white background",
    "PINTURA": "Professional product photo of {name}, painting tool, isolated on white background",
    "PLOMERIA": "Professional product photo of {name}, plumbing tool, isolated on white background",
    "OTROS": "Professional product photo of {name}, hardware store product, isolated on white background, catalog style",
}


def categorize(name):
    n = name.upper()
    if any(
        x in n
        for x in ["GUANTE", "CASCO", "LENTE", "GAFA", "PROTEC", "CARETA", "RESPIRADOR"]
    ):
        return "EPP"
    if any(
        x in n
        for x in [
            "LLAVE",
            "ALICATE",
            "PINZA",
            "DESTORNILLADOR",
            "MARTILLO",
            "ALMADANA",
            "NAPOLEON",
            "CINCEL",
            "FORMÓN",
            "HACHA",
            "PALA",
            "PICO",
        ]
    ):
        return "HERRAMIENTA_MANO"
    if any(
        x in n for x in ["SIERRA", "DISCO", "BROCA", "FRESA", "COPA", "SEGUETA", "HOJA"]
    ):
        return "ACCESORIOS_CORTE"
    if any(
        x in n
        for x in [
            "TUERCA",
            "TORNILLO",
            "PERNO",
            "ARANDELA",
            "CLAVO",
            "REMACHE",
            "BISAGRA",
            "CANDADO",
            "CERRADURA",
        ]
    ):
        return "FERRETERIA_MENOR"
    if any(
        x in n for x in ["CINTA", "METRO", "NIVEL", "ESCUADRA", "PLOMADA", "CALIBRADOR"]
    ):
        return "MEDICION"
    if any(
        x in n
        for x in [
            "COMPRESOR",
            "MOTOBOMBA",
            "SOLDAD",
            "ESMERIL",
            "TALADRO",
            "AMOLAD",
            "LIJADORA",
            "PULIDORA",
            "ROTOMARTILLO",
        ]
    ):
        return "MAQUINARIA"
    if any(x in n for x in ["CADENA", "CABLE", "CUERDA", "SOGA", "ESLABÓN"]):
        return "CADENAS_CABLES"
    if any(
        x in n
        for x in ["DOBLADORA", "PRENSA", "GATO", "EXTRACTOR", "BANCO", "TORNILLO BANCO"]
    ):
        return "HERRAMIENTA_TALLER"
    if any(
        x in n
        for x in [
            "PINTURA",
            "BROCHA",
            "RODILLO",
            "LIJA",
            "MASILLA",
            "SELLADOR",
            "IMPERMEAB",
        ]
    ):
        return "PINTURA"
    if any(
        x in n
        for x in ["TUBO", "CODO", "TEE", "UNION", "VALVULA", "LLAVE PASO", "DOBLADORA"]
    ):
        return "PLOMERIA"
    return "OTROS"


def clean_name(name):
    name = re.sub(
        r"\b(UYU|FYY|UYUS|UYU\(E\)|UYUSTOOLS|DIESEL|TR|AB|SS|AC|M|P)\b", "", name
    )
    return re.sub(r"\s+", " ", name).strip()


def gql(query, variables=None):
    r = session.post(VENDURE_URL, json={"query": query, "variables": variables or {}})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL: {data['errors'][0]['message']}")
    return data["data"]


def login():
    r = gql(
        """mutation L($u:String!,$p:String!){
        login(username:$u,password:$p){
            ...on CurrentUser{id identifier}
            ...on ErrorResult{errorCode message}
        }
    }""",
        {"u": ADMIN_USER, "p": ADMIN_PASS},
    )
    if "errorCode" in r["login"]:
        raise RuntimeError(r["login"]["message"])
    print(f"✓ Logged in as {r['login']['identifier']}")


def parse_price(raw):
    raw = raw.strip().replace(" ", "")
    if not raw:
        return 0
    raw = re.sub(r"\.(?=\d{3}[,\.])", "", raw)
    raw = raw.replace(",", ".")
    try:
        return int(float(raw))
    except ValueError:
        return 0


def load_inventory():
    products = {}
    with open(INV_CSV, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header_row = next(
        i for i, r in enumerate(rows) if r and r[0].strip().upper().startswith("CODIGO")
    )
    for row in rows[header_row + 1 :]:
        if not row or not row[0].strip():
            continue
        sku = row[0].strip()
        name = row[2].strip() if len(row) > 2 else ""
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
                m = re.search(r"id=([A-Za-z0-9_\-]+)", url)
                if m:
                    images[sku] = m.group(1)
    return images


def download_drive(drive_id, sku):
    url = f"https://drive.google.com/uc?export=download&id={drive_id}"
    s = requests.Session()
    r = s.get(url, stream=True, timeout=30)
    if "download_warning" in r.url or b"confirm" in r.content[:500]:
        token = re.search(r"confirm=([0-9A-Za-z_\-]+)", r.text)
        if token:
            r = s.get(f"{url}&confirm={token.group(1)}", stream=True, timeout=30)
    if r.status_code != 200 or len(r.content) < 2000:
        return None
    ct = r.headers.get("Content-Type", "image/jpeg")
    ext = "jpg" if "jpeg" in ct else ct.split("/")[-1].split(";")[0].strip()
    safe_sku = re.sub(r"[^A-Za-z0-9_\-]", "_", sku)
    path = os.path.join(tempfile.gettempdir(), f"{safe_sku}.{ext}")
    with open(path, "wb") as f:
        f.write(r.content)
    return path, ext


def generate_image_ai(product_name, sku):
    if not HF_TOKEN:
        return None

    try:
        from huggingface_hub import InferenceClient
    except ImportError:
        return None

    cat = categorize(product_name)
    clean = clean_name(product_name)
    prompt = CATEGORY_PROMPTS[cat].format(name=clean)
    enhanced = f"{prompt}. Product: {clean}. White background, professional catalog photo, studio lighting."

    try:
        client = InferenceClient(token=HF_TOKEN)
        image = client.text_to_image(enhanced, model="black-forest-labs/FLUX.1-schnell")

        safe_sku = re.sub(r"[^A-Za-z0-9_\-]", "_", sku)
        path = os.path.join(tempfile.gettempdir(), f"{safe_sku}_ai.png")
        image.save(path)
        return path
    except Exception as e:
        raise RuntimeError(f"HuggingFace: {e}")


def remove_background(filepath):
    if not REMOVEBG_KEY:
        return filepath
    try:
        with open(filepath, "rb") as f:
            files = {"image_file": f}
            headers = {"X-Api-Key": REMOVEBG_KEY}
            r = requests.post(
                "https://api.remove.bg/v1.0/removebg", files=files, headers=headers
            )
        if r.status_code == 200 and len(r.content) > 1000:
            with open(filepath, "wb") as f:
                f.write(r.content)
            print(f"    → Background removed")
    except Exception as e:
        print(f"    → Remove.bg error: {e}")
    return filepath


def upload_to_s3(filepath, s3_key):
    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        return None
    try:
        import boto3

        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION,
        )
        with open(filepath, "rb") as f:
            s3.upload_fileobj(
                f, S3_BUCKET, s3_key, ExtraArgs={"ContentType": "image/png"}
            )
        return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    except Exception as e:
        print(f"    → S3 error: {e}")
        return None
    try:
        import boto3

        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION,
        )
        with open(filepath, "rb") as f:
            s3.upload_fileobj(
                f,
                S3_BUCKET,
                s3_key,
                ExtraArgs={"ContentType": "image/png", "ACL": "public-read"},
            )
        return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    except Exception as e:
        print(f"    → S3 error: {e}")
        return None


def upload_asset(filepath, filename):
    with open(filepath, "rb") as f:
        content = f.read()

    if len(content) > 3_000_000:
        try:
            img = Image.open(io.BytesIO(content))
            img.thumbnail((1200, 1200))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            content = buf.getvalue()
            filename = filename.rsplit(".", 1)[0] + ".png"
        except Exception:
            pass

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }.get(ext, "image/png")

    r = session.post(
        VENDURE_URL,
        data={
            "operations": json.dumps(
                {
                    "query": """mutation CA($file:Upload!){
                    createAssets(input:[{file:$file}]){
                        ...on Asset{id name}
                        ...on ErrorResult{errorCode message}
                    }
                }""",
                    "variables": {"file": None},
                }
            ),
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
    r = gql(
        """query C($sku:String!){
        productVariants(options:{filter:{sku:{eq:$sku}}}){totalItems}
    }""",
        {"sku": sku},
    )
    return r["productVariants"]["totalItems"] > 0


def create_product(p, asset_id):
    slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
    slug = f"{slug}-{re.sub(r'[^a-z0-9]', '', p['sku'].lower())}"
    prod = gql(
        """mutation CP($input:CreateProductInput!){
        createProduct(input:$input){id}
    }""",
        {
            "input": {
                "translations": [
                    {
                        "languageCode": "es",
                        "name": p["name"],
                        "slug": slug,
                        "description": "",
                    }
                ],
                "assetIds": [asset_id] if asset_id else [],
                "featuredAssetId": asset_id,
            }
        },
    )
    pid = prod["createProduct"]["id"]
    gql(
        """mutation CV($input:[CreateProductVariantInput!]!){
        createProductVariants(input:$input){id}
    }""",
        {
            "input": [
                {
                    "productId": pid,
                    "sku": p["sku"],
                    "price": p["price"],
                    "taxCategoryId": TAX_CATEGORY_ID,
                    "translations": [{"languageCode": "es", "name": p["name"]}],
                    "assetIds": [asset_id] if asset_id else [],
                    "featuredAssetId": asset_id,
                    "stockOnHand": 0,
                    "trackInventory": "FALSE",
                }
            ]
        },
    )
    return pid


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Limit number of products (default: 10, 0 for all)",
    )
    parser.add_argument("--no-ai", action="store_true", help="Skip AI image generation")
    parser.add_argument(
        "--no-drive",
        action="store_true",
        help="Only process products without Drive images",
    )
    args = parser.parse_args()

    login()
    inventory = load_inventory()
    images = load_images()

    print(f"Inventory: {len(inventory)} products")
    print(f"Images: {len(images)} from Drive")
    print(f"AI Generation: {'Disabled' if args.no_ai else 'Enabled'}")
    print(f"S3 Upload: {'Enabled' if AWS_ACCESS_KEY else 'Disabled'}")
    print(f"Remove.bg: {'Enabled' if REMOVEBG_KEY else 'Disabled'}")

    skus = list(inventory.keys())

    # Filter to products without Drive images if --no-drive flag
    if hasattr(args, "no_drive") and args.no_drive:
        skus = [sku for sku in skus if sku not in images]
        print(f"Filtered to products without Drive images: {len(skus)}")

    if args.limit:
        skus = skus[: args.limit]

    created = skipped = failed = 0
    ai_generated = 0

    for i, sku in enumerate(skus, 1):
        p = inventory[sku]
        prefix = f"[{i}/{len(skus)}] {sku}"

        if sku_exists(sku):
            print(f"  {prefix} — SKIP (exists)")
            skipped += 1
            continue

        asset_id = None
        source = ""
        has_drive = sku in images

        # Try Drive image first
        if has_drive:
            try:
                result = download_drive(images[sku], sku)
                if result:
                    path, ext = result
                    path = remove_background(path)
                    s3_key = f"productos/{sku}_drive.{ext}"
                    s3_url = upload_to_s3(path, s3_key)
                    asset_id = upload_asset(path, f"{sku}.{ext}")
                    os.remove(path)
                    source = "📷 Drive"
            except Exception as e:
                print(f"  {prefix} — Drive failed: {e}")

        # Generate AI image if no Drive image and AI enabled
        if not asset_id and not args.no_ai and HF_TOKEN:
            try:
                path = generate_image_ai(p["name"], sku)
                if path:
                    path = remove_background(path)
                    s3_key = f"productos/{sku}_ai.png"
                    s3_url = upload_to_s3(path, s3_key)
                    asset_id = upload_asset(path, f"{sku}_ai.png")
                    os.remove(path)
                    source = "🤖 AI"
                    ai_generated += 1
            except Exception as e:
                print(f"  {prefix} — AI failed: {e}")

        try:
            create_product(p, asset_id)
            img_icon = source if source else "—"
            print(f"  {prefix} ✓ ${p['price']:,} {img_icon} {p['name'][:35]}")
            created += 1
        except Exception as e:
            print(f"  {prefix} ✗ FAILED: {e}")
            failed += 1

        if i % 20 == 0:
            time.sleep(2)

    print(f"\n{'═' * 60}")
    print(f"  Created: {created} | Skipped: {skipped} | Failed: {failed}")
    print(f"  AI Generated: {ai_generated}")
    print(f"{'═' * 60}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
