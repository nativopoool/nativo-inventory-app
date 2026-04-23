import urllib.request
import json
import sys

def search_products(term):
    url = 'https://erp.ferreteriaelhogar.com/shop-api'
    query = '''
    query SearchProducts($term: String!) {
      search(input: { term: $term, groupByProduct: true, take: 5 }) {
        items {
          productName
          price { ... on PriceRange { min max } ... on SinglePrice { value } }
          currencyCode
        }
      }
    }
    '''
    req = urllib.request.Request(url, method='POST', headers={'Content-Type': 'application/json'})
    data = json.dumps({'query': query, 'variables': {'term': term}}).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            res = json.loads(response.read().decode('utf-8'))
            items = res['data']['search']['items']
            if not items:
                print(f'No se encontraron productos para: {term}')
                return
            for item in items:
                price_val = item['price'].get('value', item['price'].get('min', 0))
                price_formatted = f'[ADMIN-ONLY] ${price_val/100:,.0f} COP' if price_val else '[ADMIN-ONLY] Precio variable'
                print(f'- {item["productName"]}: {price_formatted}')
    except Exception as e:
        print(f'Error buscando en el catálogo: {e}')

if __name__ == '__main__':
    if len(sys.argv) > 1:
        search_products(sys.argv[1])
    else:
        print('Uso: python3 search_catalog.py "termino de busqueda"')
