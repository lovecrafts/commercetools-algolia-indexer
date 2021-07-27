import customExporter from './customExporter.js';
import fs from 'fs';
import dotenv from "dotenv";
import path from 'path';
import zip from 'node-zip';

import { sendtoalgolia } from './pushToAlgolia.js'
dotenv.config();

var startBatching = new Date(),
    endBatching, startConvertion, endConvertion, startSync, batchSync, endSync;
const apiConfig = {
    apiUrl: process.env.CT_API_URL,
    host: process.env.CT_HOST,
    authUrl: process.env.CT_AUTH_URL,
    projectKey: process.env.CT_PROJECT_KEY,
    credentials: {
        clientId: process.env.CT_CLIENT_ID,
        clientSecret: process.env.CT_CLIENT_SECRECT,
    }
}
const exportConfig = {
    batch: parseInt(process.env.PRODUCTS_PER_BATCH),
    json: true,
    staged: true,
    expand: ['description']

}
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.debug,
}

const accessToken = process.env.CT_ACCESS_TOKEN;

const CcustomExporter = new customExporter(
    apiConfig,
    exportConfig,
    logger,
    accessToken,
)
var outputStream = fs.createWriteStream('products.txt');

// // Register error listener
outputStream.on('error', function(v) {
    console.log(v);
})
removefiles();

function removefiles() {
    const jsonsInDir = fs.readdirSync('./data').filter(file => path.extname(file) === '.json');
    jsonsInDir.forEach(file => {
        fs.unlinkSync(path.join('./data', file));
    })
}
outputStream.on('finish', function(v) {
    endBatching = new Date() - startBatching;

    console.log("Batch files saved total time taken : %ds", endBatching / 1000);
    console.log('-----------------------------------------');
    var ziper = new zip();
    const jsonsInDir = fs.readdirSync('./data').filter(file => path.extname(file) === '.json');
    jsonsInDir.forEach(file => {
        startConvertion = Date();
        var finalproducts = []
        const categories = JSON.parse(fs.readFileSync('categories.json'));
        const fileData = fs.readFileSync(path.join('./data', file));
        const products = JSON.parse(fileData.toString());
        var fproducts = [];
        var env_attributes = (process.env.ATTRIBUTES).split(',');
        for (let product of products) {

            let k = product.categories.length;
            if (k != 0) {
                let parent_cat = categories.filter(x => x.id == product.categories[(k != 0 ? k - 1 : k)].id)[0];
                product.categories.push(parent_cat.parent);
            }
        }
        for (let product of products) {
            product.variants.push(product.masterVariant);
            let inc = 0;
            if (product.variants) {
                for (var variant of product.variants) {
                    if (variant.prices) {
                        for (let price of variant.prices) {
                            if (price.value.currencyCode == "USD")
                                product.variants[inc].price = price.value;
                        }
                    }

                    for (let attr of env_attributes) {
                        product[attr] = [];
                    }

                    for (var attribute of variant.attributes) {
                        if (env_attributes.includes(attribute.name)) {
                            product.variants[inc][attribute.name] = attribute.value.key;
                            if (!product[attribute.name].includes(attribute.value.key))
                                product[attribute.name].push(attribute.value.key);
                        }
                    }
                    inc++;
                }
                product.variants.sort((a, b) => a.id - b.id);
            }

            let j = 0;
            let k = product.categories.length;
            for (let cat of product.categories) {
                if (cat) {
                    var obj = categories.filter(x => x.id == cat.id)[0];
                    product.categories[j].slug = obj.slugURL;
                    product.categories[j]['lvl' + (k != 0 ? k - 1 : k)] = obj.categoryURL;
                    j++;
                    k--;
                }
            }
            if (product.categories[0]) {
                var h_categories = categories.filter(x => product.categories[0].id == x.id)[0].categories;
                product.hierarchicalCategories = h_categories;
            } else
                product.hierarchicalCategories = [];
            fproducts.push(product);
        }
        for (let product of fproducts) {
            for (let variant of product.variants) {
                var resultdata = {
                    objectID: variant.sku,
                    parentId: product.id,
                    name: product.name,
                    description: product.description,
                    slug: product.slug,
                    sku: variant.sku,
                    categories: product.categories,
                    hierarchicalCategories: product.hierarchicalCategories,
                    price: variant.price,
                    images: variant.images,
                };
                for (let attr of env_attributes) {
                    resultdata[attr] = variant[attr];
                }
                finalproducts.push(resultdata);

            }

        }
        if (finalproducts) {
            endConvertion = new Date() - startConvertion;

            sendtoalgolia(startBatching, endBatching, endSync, 'Product', file, finalproducts, process.env.ALGOLIA_PRODUCTS_INDEX_NAME);
            finalproducts = []
            ziper.file(file, fs.readFileSync(path.join('./data', file)));
        }

    });
    var data = ziper.generate({ base64: false, compression: 'DEFLATE' });
    try {
        if (!fs.existsSync("./archive")) {
            fs.mkdirSync('./archive')
        }
    } catch (err) {
        console.error(err)
    }
    fs.writeFileSync('./archive/file_' + process.env.CT_PROJECT_KEY + '.zip', data, 'binary');
})
console.log("Product Indexer Executing ..." + '\n')
console.time('Product Indexer code execution time:');
CcustomExporter.run(outputStream);
try {
    fs.unlinkSync('./categories.txt');
    fs.unlinkSync('./products.txt');
} catch (err) {}
console.timeEnd('Product Indexer code execution time:');