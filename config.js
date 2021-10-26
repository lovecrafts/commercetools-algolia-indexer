import dotenv from "dotenv";
dotenv.config();

const config = {
  ctCategoryDumpFileName: "ct_category_export.json",
  ctProductDumpFileName: "ct_product_export.json",
  productCategoriesDumpFileName: "product_importer_categories.json",
  categoryDebugDumpFileName: "algolia_category_import.json",
  locales: ['en-GB', 'en-US', 'en-AU', 'de-DE'],
  localeFallbacks: { // order to search translations if target is missing (non-recursive)
    'en-GB': ['en-US', 'en-AU'],
    'en-US': ['en-GB', 'en-AU'],
    'en-AU': ['en-GB', 'en-US'],
    'de-DE': ['en-GB', 'en-US', 'en-AU']
  },
  algoliaProjectId: process.env.ALGOLIA_PROJECT_ID,
  algoliaWriteKey: process.env.ALGOLIA_WRITE_KEY,
  algoliaCategoryIndexName: process.env.ALGOLIA_CATEGORY_INDEX_NAME,
  algoliaProductIndexName: process.env.ALGOLIA_PRODUCT_INDEX_NAME,
  algoliaConnectTimeout: 180,
  algoliaReadTimeout: 180,
  algoliaWriteTimeout: 180,
  algoliaDnsTimeout: 180,
  ctApiUrl: process.env.CT_API_URL,
  ctAuthUrl: process.env.CT_AUTH_URL,
  ctHost: process.env.CT_HOST,
  ctProjectKey: process.env.CT_PROJECT_KEY,
  ctClientId: process.env.CT_CLIENT_ID,
  ctClientSecret: process.env.CT_CLIENT_SECRECT,
  productsPerBatch: 500,
  productAttributes: ["shippingRestrictions"],
  varientAttributes: [
    "brand",
    "colourButtons",
    "craft",
    "crochetHookSize",
    "isDesigner",
    "isVirtual",
    "lengthNeedles",
    "needleSize",
    "primaryCraft",
    "subtitle",
    "taxjarCategoryCode",
    "type",
  ],
};

export default {
  ...config,
  commerceToolsAuth: {
    apiUrl: config.ctApiUrl,
    host: config.ctHost,
    authUrl: config.ctAuthUrl,
    projectKey: config.ctProjectKey,
    credentials: {
      clientId: config.ctClientId,
      clientSecret: config.ctClientSecret
    }
  }
};
