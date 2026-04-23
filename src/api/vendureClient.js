import { WHISPER_API } from '../constants/modes';

/**
 * Vendure API Client
 * Centralizes all GraphQL calls and Whisper audio transcriptions.
 */

export const vendureFetch = async (apiUrl, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${errorBody || response.statusText}`);
  }

  const json = await response.json();
  return { json, headers: response.headers };
};

export const loginMutation = async (apiUrl, username, password) => {
  const query = `mutation Login($u: String!, $p: String!) {
    login(username: $u, password: $p) { __typename }
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { u: username, p: password } });
};

/**
 * Autenticación mediante Google
 */
export const authenticateGoogleMutation = async (apiUrl, googleToken) => {
  const query = `mutation Authenticate($token: String!) {
    authenticate(input: { google: { token: $token } }) {
      __typename
      ... on User { id identifier }
    }
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { token: googleToken } });
};

/**
 * Obtener lista de instancias del ERP sincronizadas
 */
export const getErpInstancesQuery = async (apiUrl, token) => {
  const query = `query {
    getMyErpInstances { name apiUrl username password }
  }`;
  
  return vendureFetch(apiUrl, { query }, token);
};

export const searchBySkuQuery = async (apiUrl, token, sku) => {
  const query = `query Q($sku: String!) {
    productVariants(options: { filter: { sku: { eq: $sku } } }) {
      items { id name sku stockOnHand price }
    }
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { sku } }, token);
};

export const updateStockMutation = async (apiUrl, token, variantId, newStock) => {
  const query = `mutation M($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) { __typename ... on ProductVariant { id sku stockOnHand } }
  }`;
  
  return vendureFetch(apiUrl, { 
    query, 
    variables: { input: [{ id: variantId, stockOnHand: newStock }] } 
  }, token);
};

export const createProductMutation = async (apiUrl, token, name, langCode) => {
  const query = `mutation CP($input: CreateProductInput!) {
    createProduct(input: $input) { id name }
  }`;
  
  const input = {
    translations: [{ 
      languageCode: langCode, 
      name, 
      slug: name.toLowerCase().replace(/ /g, '-'), 
      description: '' 
    }],
  };
  
  return vendureFetch(apiUrl, { query, variables: { input } }, token);
};

export const createVariantMutation = async (apiUrl, token, input) => {
  const query = `mutation CV($input: [CreateProductVariantInput!]!) {
    createProductVariants(input: $input) { id name sku stockOnHand }
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { input: [input] } }, token);
};

export const transcribeAudio = async (audioUri, hfToken) => {
  const response = await fetch(audioUri);
  const blob = await response.blob();

  const headers = { 'Content-Type': 'audio/m4a' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  const whisperRes = await fetch(WHISPER_API, {
    method: 'POST',
    headers,
    body: blob,
  });

  if (!whisperRes.ok) {
    const errorData = await whisperRes.json().catch(() => ({}));
    throw new Error(errorData.error || `Whisper API Error ${whisperRes.status}`);
  }

  return whisperRes.json();
};

export const getStockLocationsQuery = async (apiUrl, token) => {
  const query = `query {
    stockLocations {
      items { id name }
    }
  }`;
  
  return vendureFetch(apiUrl, { query }, token);
};

export const searchProductsQuery = async (apiUrl, token, term = '', stockLocationId = null) => {
  const query = `query S($input: SearchInput!) {
    search(input: $input) {
      items {
        productId
        productName
        slug
        sku
        productVariantId
        priceWithTax { ... on SinglePrice { value } ... on PriceRange { min max } }
        currencyCode
        stockLevel
      }
      totalItems
    }
  }`;
  
  const variables = {
    input: {
      term,
      facetValueIds: [], // Placeholder if needed
      groupByProduct: true,
      take: 20
    }
  };

  // If stockLocationId is provided, we might need a custom approach or 
  // ensure the search index includes stock levels per location.
  // Standard Vendure search usually filters by collection/facet.
  // We'll pass it if the backend supports it or use it to filter results client-side for now.
  
  return vendureFetch(apiUrl, { query, variables }, token);
};

export const submitDynamicFormMutation = async (apiUrl, token, code, targetId, data) => {
  const query = `mutation S($code: String!, $tid: ID, $data: JSON!) {
    submitDynamicForm(code: $code, targetId: $tid, data: $data)
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { code, tid: targetId, data } }, token);
};

export const getDynamicFormSchemaQuery = async (apiUrl, token, code) => {
  const query = `query Q($code: String!) {
    dynamicFormSchema(code: $code) {
      code
      target
      schema
    }
  }`;
  
  return vendureFetch(apiUrl, { query, variables: { code } }, token);
};


