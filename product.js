import customExporter from './customExporter.js'
import fs from 'fs'
import algoliasearch from 'algoliasearch'
import dotenv from "dotenv";
import path from 'path'
dotenv.config();
const client = algoliasearch(process.env.ALGOLIA_PROJECT_ID, process.env.ALGOLIA_WRITE_KEY)
const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME)

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
    batch: parseInt(process.env.PRODUCTS_PER_BATCH),
    json: true,
    staged: true,
    total: parseInt(process.env.TOTAL_PRODUCTS),
}
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.debug,
}

// // sunrise data
const accessToken = process.env.ACCESS_TOKEN;

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
outputStream.on('finish', () => {

    const jsonsInDir = fs.readdirSync('./data').filter(file => path.extname(file) === '.json');
    jsonsInDir.forEach(file => {
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
            // product.color = [];
            // product.commonSize = [];
            // product.Fabric = [];

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
            console.log(finalproducts.length)
            sendtoalgolia(path.join('./data', file), path.join('./dest', file), finalproducts);

        }

    });


})
async function sendtoalgolia(frompath, topath, finalproducts) {
    console.log('Sync called')
    if (await index
        .saveObjects(finalproducts, { autoGenerateObjectIDIfNotExist: true })
        .then(() => {

            fs.copyFile(frompath, topath, (err) => {
                if (err) throw err;
                fs.unlink(frompath, function() {
                    // file deleted
                });

            });
            finalproducts = []

        })
        .catch(err => {
            console.log(err);
        })) {
        console.log('success')
    }
}
CcustomExporter.run(outputStream);