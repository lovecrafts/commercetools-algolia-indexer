import ProductExporter from '@commercetools/product-exporter'
import fs from 'fs'
import algoliasearch from 'algoliasearch'
const client = algoliasearch('RA46FT2Q5G', '69a1fff0143c7121bc2f35825680b272')
const index = client.initIndex('CTL-VueStoredata-experiment-products')
import dotenv from "dotenv";

dotenv.config();

const apiConfig = {
    // sunrise project
    // -- -- -- -- -- -- -- -- -- -- --

    apiUrl: process.env.API_URL,
    host: process.env.HOST,
    authUrl: process.env.AUTH_URL,
    projectKey: process.env.PROJECT_KEY,
    credentials: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRECT,
    }
}
const exportConfig = {
    batch: parseInt(process.env.BATCH_COUNT),
    json: true,
    staged: true,
    total: parseInt(process.env.TOTAL_RECORDS),
}
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.debug,
}

// sunrise data
const accessToken = process.env.ACCESS_TOKEN;

const productExporter = new ProductExporter.default(
    apiConfig,
    exportConfig,
    logger,
    accessToken,
)
var outputStream = fs.createWriteStream('products.txt');
// Register error listener
outputStream.on('error', function(v) {
    console.log(v);
})
outputStream.on('finish', () => {});

productExporter.run(outputStream)