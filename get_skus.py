import requests, json

VENDURE_URL = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER = "superadmin"
ADMIN_PASS = "2supe1r23ad1mi3F"

session = requests.Session()

def gql(query, variables=None):
    r = session.post(VENDURE_URL, json={"query": query, "variables": variables or {}})
    return r.json()["data"]

def login():
    gql("mutation L($u:String!,$p:String!){login(username:$u,password:$p){...on CurrentUser{id identifier}}}", {"u": ADMIN_USER, "p": ADMIN_PASS})

def get_no_image_skus(limit=50):
    products = []
    skip = 0
    while len(products) < limit:
        r = gql(f'{{products(options:{{take:100,skip:{skip}}}){{totalItems items{{id name featuredAsset{{id}} variants{{sku}}}}}}}}')
        items = r['products']['items']
        if not items: break
        for p in items:
            if not p['featuredAsset']:
                sku = p['variants'][0]['sku'] if p['variants'] else ''
                if sku:
                    products.append({"sku": sku, "name": p['name']})
                if len(products) >= limit: break
        skip += 100
        if skip >= r['products']['totalItems']: break
    print(json.dumps(products, indent=2))

if __name__ == "__main__":
    login()
    get_no_image_skus(50)
