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

def count_images():
    total = 0
    with_img = 0
    skip = 0
    while True:
        r = gql(f'{{products(options:{{take:100,skip:{skip}}}){{totalItems items{{featuredAsset{{id}}}}}}}}')
        items = r['products']['items']
        total = r['products']['totalItems']
        if not items: break
        with_img += len([i for i in items if i['featuredAsset']])
        skip += 100
        if skip >= total: break
    
    print(f"Total Products: {total}")
    print(f"With Image: {with_img}")
    print(f"Without Image: {total - with_img}")

if __name__ == "__main__":
    login()
    count_images()
