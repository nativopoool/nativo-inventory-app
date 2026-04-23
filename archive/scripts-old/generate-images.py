#!/usr/bin/env python3
"""
Assign images to all products without one.
Strategy:
  1. Products with Drive URL in imagenes.csv → download & upload
  2. Products without Drive URL → generate with Amazon Bedrock Nova Canvas
     (requires Bedrock model access enabled in AWS console)

Run: python3 generate-images.py [--drive-only] [--bedrock-only] [--limit N]
"""

import requests, csv, json, re, sys, os, tempfile, time, base64, argparse
import boto3

VENDURE_URL     = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER      = "superadmin"
ADMIN_PASS      = "2supe1r23ad1mi3F"
S3_BUCKET       = "ferreteria-assets"
BEDROCK_REGION  = "us-east-1"
BEDROCK_MODEL   = "amazon.nova-canvas-v1:0"

session = requests.Session()

# ── Prompts por categoría ─────────────────────────────────────────────────────
CATEGORY_PROMPTS = {
    'EPP': "Professional product photo of {name}, personal protective equipment, isolated on white background, hardware store catalog style, sharp focus, studio lighting",
    'HERRAMIENTA_MANO': "Professional product photo of {name}, hand tool, isolated on white background, hardware store catalog, sharp focus, studio lighting",
    'ACCESORIOS_CORTE': "Professional product photo of {name}, cutting accessory tool, isolated on white background, hardware store catalog, sharp focus",
    'FERRETERIA_MENOR': "Professional product photo of {name}, hardware fastener, isolated on white background, hardware store catalog, sharp focus",
    'MEDICION': "Professional product photo of {name}, measuring tool, isolated on white background, hardware store catalog, sharp focus",
    'MAQUINARIA': "Professional product photo of {name}, power tool machine, isolated on white background, hardware store catalog, sharp focus, studio lighting",
    'CADENAS_CABLES': "Professional product photo of {name}, chain or cable hardware, isolated on white background, hardware store catalog, sharp focus",
    'HERRAMIENTA_TALLER': "Professional product photo of {name}, workshop tool, isolated on white background, hardware store catalog, sharp focus",
    'PINTURA': "Professional product photo of {name}, painting tool or supply, isolated on white background, hardware store catalog, sharp focus",
    'PLOMERIA': "Professional product photo of {name}, plumbing tool or fitting, isolated on white background, hardware store catalog, sharp focus",
    'OTROS': "Professional product photo of {name}, hardware store product, isolated on white background, catalog style, sharp focus, studio lighting",
}

def categorize(name):
    n = name.upper()
    if any(x in n for x in ['GUANTE','CASCO','LENTE','GAFA','PROTEC','CARETA','RESPIRADOR']):
        return 'EPP'
    if any(x in n for x in ['LLAVE','ALICATE','PINZA','DESTORNILLADOR','MARTILLO','ALMADANA','NAPOLEON','CINCEL','FORMÓN','HACHA','PALA','PICO']):
        return 'HERRAMIENTA_MANO'
    if any(x in n for x in ['SIERRA','DISCO','BROCA','FRESA','COPA','SEGUETA','HOJA']):
        return 'ACCESORIOS_CORTE'
    if any(x in n for x in ['TUERCA','TORNILLO','PERNO','ARANDELA','CLAVO','REMACHE','BISAGRA','CANDADO','CERRADURA']):
        return 'FERRETERIA_MENOR'
    if any(x in n for x in ['CINTA','METRO','NIVEL','ESCUADRA','PLOMADA','CALIBRADOR']):
        return 'MEDICION'
    if any(x in n for x in ['COMPRESOR','MOTOBOMBA','SOLDAD','ESMERIL','TALADRO','AMOLAD','LIJADORA','PULIDORA','ROTOMARTILLO']):
        return 'MAQUINARIA'
    if any(x in n for x in ['CADENA','CABLE','CUERDA','SOGA','ESLABÓN']):
        return 'CADENAS_CABLES'
    if any(x in n for x in ['DOBLADORA','PRENSA','GATO','EXTRACTOR','BANCO','TORNILLO BANCO']):
        return 'HERRAMIENTA_TALLER'
    if any(x in n for x in ['PINTURA','BROCHA','RODILLO','LIJA','MASILLA','SELLADOR','IMPERMEAB']):
        return 'PINTURA'
    if any(x in n for x in ['TUBO','CODO','TEE','UNION','VALVULA','LLAVE PASO','DOBLADORA']):
        return 'PLOMERIA'
    return 'OTROS'

def clean_name_for_prompt(name):
    """Remove codes, abbreviations, make readable for AI prompt."""
    name = re.sub(r'\b(UYU|FYY|UYUS|UYU\(E\)|UYUSTOOLS|DIESEL|TR|AB|SS|AC|M|P)\b', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name.lower()

# ── GraphQL ───────────────────────────────────────────────────────────────────
def gql(query, variables=None):
    r = session.post(VENDURE_URL, json={"query": query, "variables": variables or {}})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL: {data['errors'][0]['message']}")
    return data["data"]

def login():
    r = gql("mutation L($u:String!,$p:String!){login(username:$u,password:$p){...on CurrentUser{id identifier}...on ErrorResult{errorCode message}}}", {"u": ADMIN_USER, "p": ADMIN_PASS})
    if "errorCode" in r["login"]:
        raise RuntimeError(r["login"]["message"])
    print(f"✓ {r['login']['identifier']}")

# ── Get all products without image ───────────────────────────────────────────
def get_no_image_products():
    products = []
    skip = 0
    while True:
        r = gql(f'{{products(options:{{take:200,skip:{skip}}}){{items{{id name featuredAsset{{id}} variants{{sku}}}}}}}}')
        items = r['products']['items']
        if not items: break
        for p in items:
            if not p['featuredAsset']:
                sku = p['variants'][0]['sku'] if p['variants'] else ''
                products.append({'id': p['id'], 'name': p['name'], 'sku': sku})
        skip += 200
        if len(items) < 200: break
    return products

# ── Load Drive image map ──────────────────────────────────────────────────────
def load_drive_map():
    img_map = {}
    with open('_INVENTARIOS B - imagenes.csv', encoding='utf-8-sig') as f:
        for row in csv.reader(f):
            if len(row) >= 3 and 'drive.google.com' in row[2]:
                m = re.search(r'id=([A-Za-z0-9_\-]+)', row[2])
                if m:
                    img_map[row[0].strip()] = m.group(1)
    return img_map

# ── Download from Google Drive ────────────────────────────────────────────────
def download_drive(drive_id, sku):
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

# ── Generate with Bedrock ─────────────────────────────────────────────────────
bedrock = None

def get_bedrock():
    global bedrock
    if bedrock is None:
        bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
    return bedrock

def generate_image_bedrock(product_name, sku):
    cat = categorize(product_name)
    clean_name = clean_name_for_prompt(product_name)
    prompt = CATEGORY_PROMPTS[cat].format(name=clean_name)
    neg = "blurry, text, watermark, logo, person, hands, background clutter, low quality, distorted"

    body = json.dumps({
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt,
            "negativeText": neg,
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "height": 512,
            "width": 512,
            "quality": "standard",
            "cfgScale": 7.5,
            "seed": abs(hash(sku)) % 2147483647,
        }
    })

    client = get_bedrock()
    r = client.invoke_model(modelId=BEDROCK_MODEL, body=body)
    result = json.loads(r['body'].read())

    if 'error' in result:
        raise RuntimeError(f"Bedrock error: {result['error']}")

    img_bytes = base64.b64decode(result['images'][0])
    safe_sku = re.sub(r'[^A-Za-z0-9_\-]', '_', sku)
    path = os.path.join(tempfile.gettempdir(), f"{safe_sku}_gen.jpg")
    with open(path, 'wb') as f:
        f.write(img_bytes)
    return path, 'jpg', cat, prompt

# ── Upload asset to Vendure ───────────────────────────────────────────────────
def upload_asset(filepath, filename):
    with open(filepath, "rb") as f:
        content = f.read()

    # Resize if too large (>2MB)
    if len(content) > 2_000_000:
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content))
            img.thumbnail((1024, 1024))
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=82)
            content = buf.getvalue()
            filename = filename.rsplit('.', 1)[0] + '.jpg'
        except Exception:
            pass

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

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
        raise RuntimeError(f"Upload GQL error: {data['errors']}")
    asset = data["data"]["createAssets"][0]
    if "errorCode" in asset:
        raise RuntimeError(f"Asset error: {asset['message']}")
    return asset["id"]

# ── Assign asset to product ───────────────────────────────────────────────────
def assign_asset(product_id, asset_id):
    gql("""mutation UP($input:UpdateProductInput!){
        updateProduct(input:$input){id}
    }""", {"input": {
        "id": product_id,
        "assetIds": [asset_id],
        "featuredAssetId": asset_id,
    }})
    # Also assign to variant
    r = gql(f'{{product(id:"{product_id}"){{variants{{id}}}}}}')
    for v in r['product']['variants']:
        gql("""mutation UV($input:[UpdateProductVariantInput!]!){
            updateProductVariants(input:$input){id}
        }""", {"input": [{"id": v['id'], "assetIds": [asset_id], "featuredAssetId": asset_id}]})

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--drive-only', action='store_true', help='Only process products with Drive URLs')
    parser.add_argument('--bedrock-only', action='store_true', help='Only generate with Bedrock')
    parser.add_argument('--limit', type=int, default=0, help='Limit number of products to process')
    args = parser.parse_args()

    login()
    products = get_no_image_products()
    drive_map = load_drive_map()

    print(f"Products without image: {len(products)}")

    # Split
    with_drive  = [(p, drive_map[p['sku']]) for p in products if p['sku'] in drive_map]
    need_gen    = [p for p in products if p['sku'] not in drive_map]

    print(f"  With Drive URL: {len(with_drive)}")
    print(f"  Need generation: {len(need_gen)}")

    to_process = []
    if not args.bedrock_only:
        to_process += [('drive', p, did) for p, did in with_drive]
    if not args.drive_only:
        to_process += [('bedrock', p, None) for p in need_gen]

    if args.limit:
        to_process = to_process[:args.limit]

    ok = fail = skip_bedrock = 0

    for i, (source, p, extra) in enumerate(to_process, 1):
        prefix = f"[{i}/{len(to_process)}] {p['sku']}"

        try:
            if source == 'drive':
                result = download_drive(extra, p['sku'])
                if not result:
                    print(f"  {prefix} ⚠ Drive download failed")
                    fail += 1
                    continue
                path, ext = result
                asset_id = upload_asset(path, f"{re.sub(r'[^A-Za-z0-9_-]','_',p['sku'])}.{ext}")
                os.remove(path)
                assign_asset(p['id'], asset_id)
                print(f"  {prefix} ✓ Drive → asset {asset_id}  {p['name'][:40]}")
                ok += 1

            else:  # bedrock
                path, ext, cat, prompt = generate_image_bedrock(p['name'], p['sku'])
                asset_id = upload_asset(path, f"{re.sub(r'[^A-Za-z0-9_-]','_',p['sku'])}_gen.jpg")
                os.remove(path)
                assign_asset(p['id'], asset_id)
                print(f"  {prefix} ✓ AI({cat}) → asset {asset_id}  {p['name'][:35]}")
                ok += 1
                time.sleep(1.5)  # respect rate limits

        except Exception as e:
            err = str(e)
            if 'ThrottlingException' in err or 'quota' in err.lower():
                print(f"  {prefix} ⏸ Bedrock quota not enabled — run with --drive-only or enable model access in AWS console")
                skip_bedrock += 1
                if skip_bedrock >= 3:
                    print("\n  ⚠ Bedrock quota exhausted. Enable model access at:")
                    print("    https://us-east-1.console.aws.amazon.com/bedrock/home#/modelaccess")
                    print("  Then re-run: python3 generate-images.py --bedrock-only")
                    break
            else:
                print(f"  {prefix} ✗ {err[:80]}")
                fail += 1

        if i % 50 == 0:
            time.sleep(2)

    print(f"\n{'═'*60}")
    print(f"  OK: {ok}  |  Failed: {fail}  |  Bedrock quota: {skip_bedrock}")
    print(f"{'═'*60}")

if __name__ == "__main__":
    main()
