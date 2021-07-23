import CategoryExporter from "@commercetools/category-exporter"
import fs from 'fs'
import dotenv from "dotenv";
dotenv.config();
const options = {
    apiConfig: {

        apiUrl: process.env.API_URL,
        host: process.env.HOST,
        authUrl: process.env.AUTH_URL,
        projectKey: process.env.PROJECT_KEY,
        credentials: {
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRECT,
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
    fs.readFile('categories.txt', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        var res = JSON.parse(data);

        var parent = res;
        var finalcategories = [];
        for (let obj of parent) {
            var category = {};
            category.id = obj.id;
            category.version = obj.version;
            category.name = obj.name;
            //category.slug = obj.slug;
            //category.ancestors = obj.ancestors;
            let lang = ['en', 'de', 'it'];
            let i = 0;
            if (obj.ancestors.length != 0) {
                category.path = { en: "", de: "", it: "" }
                category.slug = { en: "", de: "", it: "" }
            }

            for (let cat_obj of obj.ancestors) {
                var cat = res.filter(x => x.id == cat_obj.id)[0];
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
        var categories = [];
        for (let category of parent) {
            var parent_object = {};
            var object = [];
            let i = 0;
            let rootstr = "";
            var jsonVariable = {};
            parent_object.id = category.id;
            parent_object.name = category.name.en;
            parent_object.slug = category.slug.en
                //console.log(category, 'category')
            let slug_url_str = "";
            let cat_url_str = "";
            for (let cat_slug_level of category.ancestors) {
                var cat_slug = res.filter(obj => obj.id == cat_slug_level.id)[0];
                //console.log(cat_slug, 'cat_slug')
                slug_url_str += cat_slug.slug.en;
                cat_url_str += cat_slug.name.en;
                slug_url_str += '/';
                cat_url_str += ' > '
            }
            slug_url_str += category.slug.en;
            cat_url_str += category.name.en
                //console.log(slug_url_str)
            for (let cat_level of category.ancestors) {
                var cat_parent = res.filter(obj => obj.id == cat_level.id);
                let str = "lvl" + i;
                rootstr += cat_parent[0].name.en;
                jsonVariable[str] = rootstr;
                jsonVariable['lvl' + i] = rootstr;
                rootstr += ' > '
                i++;
            }
            jsonVariable['lvl' + i] = rootstr + category.name.en;
            //console.log(rootstr + category.name.en)
            object.push(jsonVariable);
            parent_object.categories = object;
            parent_object.categories_level = i;
            parent_object.slugURL = slug_url_str;
            parent_object.categoryURL = cat_url_str;
            parent_object.parent = category.parent;
            categories.push(parent_object);

        }
        fs.writeFile('categories.json', JSON.stringify(categories), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
        fs.writeFile('finalcategories.json', JSON.stringify(finalcategories), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
        console.log('done with export')
    })
})



categoryExporter.run(outputStream)