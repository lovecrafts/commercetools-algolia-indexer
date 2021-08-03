import CategoryExporter from "@commercetools/category-exporter"
import fs from 'fs'
import dotenv from "dotenv";
dotenv.config();
import { sendtoalgolia } from './pushToAlgolia.js'
var startBatching = new Date(),
    endBatching, startConvertion, endConvertion, startSync, batchSync, endSync;
const options = {
    apiConfig: {
        apiUrl: process.env.CT_API_URL,
        host: process.env.CT_HOST,
        authUrl: process.env.CT_AUTH_URL,
        projectKey: process.env.CT_PROJECT_KEY,
        credentials: {
            clientId: process.env.CT_CLIENT_ID,
            clientSecret: process.env.CT_CLIENT_SECRECT,
        }
    },

}

const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.debug,
}

const categoryExporter = new CategoryExporter.default(options, logger)
var outputStream = fs.createWriteStream('categories.txt');
// Register error listener
outputStream.on('error', function(v) {
    console.log(v);
})

outputStream.on('finish', () => {
    endBatching = new Date() - startBatching;
    startConvertion = Date();
    fs.readFile('categories.txt', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        var categories = JSON.parse(data);
        var finalcategories = [];
        for (let obj of categories) {
            var category = {};
            category.id = obj.id;
            category.version = obj.version;
            category.name = obj.name;
            category.objectID = obj.id;
            let lang = ['en', 'de', 'it'];
            let i = 0;
            if (obj.ancestors.length != 0) {
                category.path = { en: "", de: "", it: "" }
                category.slug = { en: "", de: "", it: "" }
            }

            for (let cat_obj of obj.ancestors) {
                var cat = categories.filter(x => x.id == cat_obj.id)[0];
                for (let lan of lang) {

                    if (category.path[lan] != "") {
                        category.path[lan] += ' > ';
                        category.slug[lan] += '/'
                    }
                    category.path[lan] += cat.name[lan]
                    category.slug[lan] += cat.slug[lan]

                }
            }

            if (category.path) {
                category.path.en += ' > ' + obj.name.en;
                if (category.path['de'] != "")
                    category.path.de += ' > ';
                category.path.de += obj.name.de;
                category.path.it += ' > ' + obj.name.it;
            } else {
                category.path = category.name;
                // console.log(category);
            }

            if (category.slug) {
                category.slug.en += '/' + obj.slug.en;
                if (category.slug['de'] != "")
                    category.slug.de += '/';
                category.slug.de += obj.slug.de;
                category.slug.it += '/' + obj.slug.it;
            } else {

                category.slug = obj.slug;
            }
            finalcategories.push(category)

        }

        var env_languages = (process.env.LANGUAGES).split(',');
        var resultcategories = [];
        for (let category of categories) {
            var _resultObject = {};
            _resultObject.id = category.id;
            _resultObject.categories = {};
            _resultObject.hierarchicalCategories = {};
            for (let lan of env_languages) {
                _resultObject.categories[lan] = {};
                _resultObject.hierarchicalCategories[lan] = {};
            }
            category.ancestors.push({ typeId: 'category', id: category.id });

            for (let lan of env_languages) {
                let slug_str = "";
                let path_str = "";
                let path_str_hie = "";
                let level = 0;
                for (let ancestor of category.ancestors) {
                    let _cat_obj = categories.filter(x => x.id === ancestor.id)[0];

                    if (slug_str == "") {
                        slug_str = _cat_obj.slug[lan];
                        path_str = _cat_obj.name[lan];
                        path_str_hie = _cat_obj.name[lan];

                    } else {
                        slug_str += ' / ' + _cat_obj.slug[lan];
                        path_str += ' > ' + _cat_obj.name[lan];
                        path_str_hie += ' > ' + _cat_obj.name[lan];
                    }
                    _resultObject.hierarchicalCategories[lan]['lvl' + level] = path_str_hie;

                    level++;
                }
                _resultObject.hierarchicalCategories[lan]

                _resultObject.categories[lan]['slug'] = slug_str;
                _resultObject.categories[lan]['path'] = path_str;

            }
            resultcategories.push(_resultObject)
        }

        fs.writeFile('categories.json', JSON.stringify(resultcategories), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }

        });
        if (finalcategories) {
            endConvertion = new Date() - startConvertion;
            sendtoalgolia(startBatching, endBatching, endSync, 'category', 'categories.json', finalcategories, process.env.ALGOLIA_CATEGORY_INDEX_NAME)
                // fs.writeFile('finalcategories.json', JSON.stringify(finalcategories), 'utf8', function(err) {
                //     if (err) {
                //         return console.log(err);
                //     }

            // });
        }
    })
})

console.log("Category Indexer Executing ..." + '\n')
console.time('Category Indexer code execution time:');
categoryExporter.run(outputStream);
console.timeEnd('Category Indexer code execution time:');
console.log("-----------------------------------------------");