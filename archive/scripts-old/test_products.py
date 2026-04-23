#!/usr/bin/env python3
import requests, json
VENDURE_URL = "https://erp.ferreteriaelhogar.com/admin-api"
ADMIN_USER = "superadmin"
ADMIN_PASS = "2supe1r23ad1mi3F"

session = requests.Session()

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

login()
total = 0
no_asset = 0
skip = 0
while True:
    r = gql(f'{{products(options:{{take:200,skip:{skip}}}){{items{{id name featuredAsset{{id}} variants{{sku}}}}}}}}')
    items = r['products']['items']
    if not items: break
    total += len(items)
    for p in items:
        if not p['featuredAsset']:
            no_asset += 1
            sku = p['variants'][0]['sku'] if p['variants'] else ''
            print(f"No asset: {sku} {p['name']}")
    skip += 200
    if len(items) < 200: break

print(f"Total products: {total}")
print(f"Products without featured asset: {no_asset}")