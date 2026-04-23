const API_URL = 'https://bot2market.mebot.online/admin-api';

async function run() {
  // 1. Auth
  const loginRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation { login(username: "superadmin", password: "mebot_secure_2026") { ... on CurrentUser { id } } }`
    })
  });
  const loginData = await loginRes.json();
  const cookies = loginRes.headers.get('set-cookie') || '';
  let authCookie = Array.isArray(cookies) ? cookies.find(c => c.includes('session=')) : cookies.includes('session=') ? cookies : '';
  const tokenHeader = loginRes.headers.get('vendure-auth-token');
  const headers = { 'Content-Type': 'application/json' };
  if (tokenHeader) headers['Authorization'] = `Bearer ${tokenHeader}`;
  if (authCookie) headers['Cookie'] = authCookie;

  // 2. Fetch variant and location
  const q1 = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `query {
        productVariants(options: { take: 1 }) { items { id name stockLevels { stockLocationId stockOnHand } } }
        stockLocations { items { id name } }
      }`
    })
  });
  const data1 = await q1.json();
  const variant = data1.data.productVariants.items[0];
  const location = data1.data.stockLocations.items[0];
  console.log("Initial Variant:", JSON.stringify(variant));
  console.log("Location:", location.name, location.id);

  const initialStock = variant.stockLevels.find(sl => sl.stockLocationId === location.id)?.stockOnHand || 0;

  // 3. Mutate
  const q2 = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `mutation($id: ID!, $data: JSON!) {
        submitDynamicForm(code: "inventory-intake", targetId: $id, data: $data)
      }`,
      variables: {
        id: variant.id,
        data: { quantity: 5, stockLocationId: location.id }
      }
    })
  });
  const data2 = await q2.json();
  console.log("Mutation Result:", JSON.stringify(data2));

  // 4. Fetch variant again
  const q3 = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `query { productVariant(id: "${variant.id}") { id stockLevels { stockLocationId stockOnHand } } }`
    })
  });
  const data3 = await q3.json();
  console.log("Final Variant:", JSON.stringify(data3.data.productVariant));
}
run().catch(console.error);
