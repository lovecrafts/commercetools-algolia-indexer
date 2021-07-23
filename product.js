import ProductExporter from '@commercetools/product-exporter'
import fs from 'fs'
import algoliasearch from 'algoliasearch'
const client = algoliasearch('RA46FT2Q5G', '69a1fff0143c7121bc2f35825680b272')
const index = client.initIndex('CTL-VueStoredata-experiment-products')
import dotenv from "dotenv";
dotenv.config();

const apiConfig = {

    // Newstore projectKey
    // -----------------------------

    // apiUrl: 'https://api.us-central1.gcp.commercetools.com',
    // host: 'https://auth.us-central1.gcp.commercetools.com',
    // authUrl: 'https://auth.us-central1.gcp.commercetools.com',
    // projectKey: 'ccx_ctvsfn',
    // credentials: {
    //     clientId: 'szt9IDwGJJqcHlOM5w5cYq2g',
    //     clientSecret: 'LO51Wbl2a00yq93LtsRySuQ9RDoqbdEA',
    // }

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
    //const accessToken = 'wiDZ59C5F7wyNtjkXtIdjVKeP9UrqO8s';

// sunrise data
const accessToken = process.env.ACCESS_TOKEN; //'Kx0VUukZm0kCl6kBzD1-3nt-xqKmORFC'

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
outputStream.on('finish', () => {
    fs.readFile('categories.json', (err, data) => {
        if (err) throw err;

        var categories = JSON.parse(data);
        fs.readFile('products.txt', 'utf8', function(err, data) {
            if (err) throw err;
            var productDatas = "[";
            productDatas += data.replace(/\n/g, ",");
            productDatas += "]";
            var products = JSON.parse(productDatas);
            var fproducts = [];
            var finalproducts = []
            for (let product of products) {

                let k = product.categories.length;
                if (k != 0) {
                    let parent_cat = categories.filter(x => x.id == product.categories[(k != 0 ? k - 1 : k)].id)[0];
                    product.categories.push(parent_cat.parent);
                }
            }
            for (let product of products) {
                product.color = [];
                product.commonSize = [];
                product.Fabric = [];

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

                        for (var attribute of variant.attributes) {
                            if (attribute.name == "Fabric") {
                                product.variants[inc].Fabric = attribute.value.key;
                                if (!product.Fabric.includes(attribute.value.key))
                                    product.Fabric.push(attribute.value.key);
                            }

                            if (attribute.name == "color") {
                                product.variants[inc].color = attribute.value.key;
                                if (!product.color.includes(attribute.value.key))
                                    product.color.push(attribute.value.key);
                            }

                            if (attribute.name == "commonSize") {
                                product.variants[inc].commonSize = attribute.value.key;
                                if (!product.commonSize.includes(attribute.value.key))
                                    product.commonSize.push(attribute.value.key);
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
                        parentId: product.id, // I
                        name: product.name, // I
                        description: product.description, // I
                        slug: product.slug, // I
                        sku: variant.sku, // V
                        categories: product.categories, // I
                        hierarchicalCategories: product.hierarchicalCategories, // I                       
                        color: variant.color, // V
                        commonSize: variant.commonSize, // V
                        Fabric: variant.Fabric, // V
                        price: variant.price, // V
                        images: variant.images, // V
                    };
                    finalproducts.push(resultdata);

                }


            }
            // index
            //     .saveObjects(fproducts, { autoGenerateObjectIDIfNotExist: true })
            //     .then(() => {

            //     })
            //     .catch(err => {
            //         console.log(err);
            //     });


            fs.writeFile('finalproducts.json', JSON.stringify(finalproducts), 'utf8', function(err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });

        });

    })
})

productExporter.run(outputStream)