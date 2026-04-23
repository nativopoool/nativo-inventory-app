import requests, json, re, sys, os, tempfile, time, argparse, base64
import boto3
from urllib.parse import quote

VENDURE_URL = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER = "superadmin"
ADMIN_PASS = "2supe1r23ad1mi3F"
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
    name = re.sub(r'\b(UYU|FYY|UYUS|UYU\(E\)|UYUSTOOLS|DIESEL|TR|AB|SS|AC|M|P)\b', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name.lower()

from botocore.config import Config

bedrock = None
def get_bedrock():
    global bedrock
    if bedrock is None:
        config = Config(
            region_name=BEDROCK_REGION,
            retries={'max_attempts': 0},  # We handle retries manually
            connect_timeout=15,
            read_timeout=60
        )
        bedrock = boto3.client('bedrock-runtime', config=config)
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

    # Retry logic for Bedrock
    for attempt in range(4):
        try:
            response = get_bedrock().invoke_model(
                body=body, 
                modelId=BEDROCK_MODEL, 
                accept="application/json", 
                contentType="application/json"
            )
            resp_body = json.loads(response.get("body").read())
            img_b64 = resp_body.get("images")[0]
            
            path = os.path.join(tempfile.gettempdir(), f"{sku}_ai.jpg")
            with open(path, "wb") as f:
                f.write(base64.b64decode(img_b64))
            return path, "jpg"
        except Exception as e:
            if "ThrottlingException" in str(e) and attempt < 3:
                # Exponentially increase wait time for throttling
                wait = (attempt + 1) * 60  # Wait 60s, then 120s, then 180s
                print(f"    ⚠ Throttled. Waiting {wait}s before retry...")
                time.sleep(wait)
            else:
                raise e
    return None, None

def gql(query, variables=None):
# ... rest of the functions same as before ...
    r = session.post(VENDURE_URL, json={"query": query, "variables": variables or {}}, timeout=30)
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

def get_no_image_products():
    products = []
    skip = 0
    while True:
        r = gql(f'{{products(options:{{take:100,skip:{skip}}}){{items{{id name featuredAsset{{id}} variants{{sku}}}}}}}}')
        items = r['products']['items']
        if not items: break
        for p in items:
            if not p['featuredAsset']:
                sku = p['variants'][0]['sku'] if p['variants'] else ''
                products.append({'id': p['id'], 'name': p['name'], 'sku': sku})
        skip += 100
        if len(items) < 100: break
    return products

def generate_slug(name, sku):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    slug = f"{slug}-{re.sub(r'[^a-z0-9]', '', sku.lower())}"
    return slug

def search_web_image(query, sku=None):
    """Search for an image URL using Bing and regex for direct JPG/PNG."""
    queries = [
        f"{query} product image {sku}" if sku else f"{query} product image", 
        f"UYUSTOOLS {sku} image" if sku else None,
        f"{query} {sku} site:mercadolibre.com.co" if sku else None
    ]
    queries = [q for q in queries if q]
    
    for q in queries:
        try:
            # Use Bing Images search URL
            search_url = f"https://www.bing.com/images/search?q={quote(q)}"
            headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            r = requests.get(search_url, headers=headers, timeout=10)
            
            # More relaxed regex for images (captures more varieties)
            urls = re.findall(r'https?://[^\s"\'<>]+?\.(?:jpg|jpeg|png|webp|gif)', r.text, re.I)
            # Also look for murl/turl patterns in Bing JSON
            urls += re.findall(r'"murl":"(https?://[^"]+?)"', r.text)
            
            print(f"    - Bing Images results for '{q[:30]}...': {len(urls)} raw URLs")
            
            # Filter and prioritize
            valid_urls = []
            for u in urls:
                # Clean URL (sometimes regex catches too much)
                u = u.split('?')[0] if '?' in u and not any(ext in u.lower().split('?')[-1] for ext in ['jpg','png','webp']) else u
                u = u.replace('\\/', '/') # Fix escaped slashes in JSON
                if 'bing.com' in u.lower() or 'icon' in u.lower() or 'logo' in u.lower(): continue
                valid_urls.append(u)

            priority_domains = ['uyustools', 'totalpowertools', 'novagro', 'mercadolibre', 'amazon', 'totaltools', 'hechitools']
            priority_urls = [u for u in valid_urls if any(d in u.lower() for d in priority_domains)]
            
            # Function to check if URL is accessible (quick HEAD request)
            def is_url_accessible(url):
                try:
                    resp = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
                    return resp.status_code == 200
                except:
                    return False
            
            # Check priority URLs first
            for url in priority_urls:
                if is_url_accessible(url):
                    return url
            # Check valid URLs
            for url in valid_urls:
                if is_url_accessible(url):
                    return url
            # If none accessible, fallback to first priority/valid (legacy behavior)
            if priority_urls:
                return priority_urls[0]
            if valid_urls:
                return valid_urls[0]
                
        except Exception as e:
            print(f"  Search error for '{q}': {e}")
            
    return None

def download_image(url, sku):
    headers = {'User-Agent': 'Mozilla/5.0'}
    max_retries = 3
    for attempt in range(max_retries):
        try:
            r = requests.get(url, headers=headers, stream=True, timeout=15)
            if r.status_code == 200:
                # More robust extension parsing
                from urllib.parse import urlparse
                path_part = urlparse(url).path
                ext = path_part.split('.')[-1].lower() if '.' in path_part else 'jpg'
                if ext not in ['jpg','jpeg','png','webp']: ext = 'jpg'
                
                safe_sku = re.sub(r'[^a-zA-Z0-9_-]', '_', sku)
                path = os.path.join(tempfile.gettempdir(), f"{safe_sku}_search.{ext}")
                with open(path, "wb") as f:
                    f.write(r.content)
                return path, ext
            else:
                print(f"  ✗ HTTP {r.status_code} for {url[:60]}... (attempt {attempt+1}/{max_retries})")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # exponential backoff 1,2,4 seconds
        except Exception as e:
            print(f"  ✗ Download error: {e} (attempt {attempt+1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
    return None

def upload_asset(filepath, filename):
    with open(filepath, "rb") as f:
        content = f.read()
    
    # Simple Resize check
    if len(content) > 3_000_000:
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content))
            img.thumbnail((1200, 1200))
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=85)
            content = buf.getvalue()
            filename = filename.rsplit('.', 1)[0] + '.jpg'
        except Exception: pass

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

    r = session.post(
        VENDURE_URL,
        data={
            "operations": json.dumps({
                "query": "mutation CA($file:Upload!){ createAssets(input:[{file:$file}]){ ...on Asset{id} ...on ErrorResult{message} } }",
                "variables": {"file": None},
            }),
            "map": json.dumps({"0": ["variables.file"]}),
        },
        files={"0": (filename, content, mime)},
    )
    res = r.json()
    asset = res["data"]["createAssets"][0]
    if "message" in asset: raise RuntimeError(asset["message"])
    return asset["id"]

def assign_asset(product_id, asset_id):
    gql("""mutation UP($input:UpdateProductInput!){ updateProduct(input:$input){id} }""", 
        {"input": {"id": product_id, "assetIds": [asset_id], "featuredAssetId": asset_id}})
    
    r = gql(f'{{product(id:"{product_id}"){{variants{{id}}}}}}')
    for v in r['product']['variants']:
        gql("""mutation UV($input:[UpdateProductVariantInput!]!){ updateProductVariants(input:$input){id} }""", 
            {"input": [{"id": v['id'], "assetIds": [asset_id], "featuredAssetId": asset_id}]})

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()

    login()
    products = get_no_image_products()
    print(f"Total products without image: {len(products)}")
    
    # Load manual mapping if exists
    mapping = {}
    if os.path.exists('mapping.json'):
        with open('mapping.json', 'r') as f:
            mapping = json.load(f)

    count = 0
    for p in products:
        if count >= args.limit: break
        count += 1
        
        slug = generate_slug(p['name'], p['sku'])
        query = p['name'].replace('UYUSTOOLS', '').strip()
        percent = (count / args.limit) * 100
        print(f"[{count}/{args.limit}] {percent:.1f}% | {p['sku']} | Slug: {slug} | Searching: {query}...")
        
        filepath = None
        ext = None

        # 1. Try Manual Mapping
        img_url = mapping.get(p['sku'])
        if img_url:
            print(f"  ✓ Found in mapping: {img_url[:60]}...")
            res = download_image(img_url, p['sku'])
            if res: filepath, ext = res
        
        # 2. Try Search if not found in mapping
        if not filepath:
            img_url = search_web_image(query, p['sku'])
            if img_url:
                print(f"  ✓ Found in search: {img_url[:60]}...")
                res = download_image(img_url, p['sku'])
                if res: filepath, ext = res
        
        # 3. Fallback to Bedrock AI if search failed
        if not filepath:
            print(f"  ⚠ No search result. Generating with Bedrock AI...")
            try:
                filepath, ext = generate_image_bedrock(p['name'], p['sku'])
                print(f"  ✓ AI Generated: {filepath}")
            except Exception as e:
                print(f"  ✗ AI Generation failed: {e}")
                # Log failure and move to next product

        safe_sku = re.sub(r'[^a-zA-Z0-9_-]', '_', p['sku'])
        if filepath:
            try:
                asset_id = upload_asset(filepath, f"{safe_sku}.{ext}")
                assign_asset(p['id'], asset_id)
                admin_url = f"https://erp.ferreteriaelhogar.com/admin/catalog/products/{p['id']}"
                print(f"  ✓ Updated: {admin_url}")
            except Exception as e:
                print(f"  ✗ Error uploading/assigning: {e}")
            
            if os.path.exists(filepath):
                try: os.remove(filepath)
                except: pass
        else:
            print(f"  ✗ Failed to obtain image for {p['sku']}")
            
        # Add a delay between products to avoid overwhelming the search/AI
        time.sleep(15)

if __name__ == "__main__":
    main()
