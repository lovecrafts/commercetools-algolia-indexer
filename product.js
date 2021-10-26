import customExporter from "./customExporter.js";
import fs from "fs";
import fse from "fs-extra";
import path from "path";
import { pushToAlgolia } from "./pushToAlgolia.js";
import { logger, getTranslation } from "./utils.js";
import config from "./config.js";

const exportConfig = {
  batch: config.productsPerBatch,
  json: true,
  staged: true,
  expand: config.productAttributes
};

const getImageAssets = fProduct => {
  const images = [];
  if (fProduct.assets) {
    for (const asset of fProduct.assets) {
      if ('sources' in asset) {
        const image = {
          id: asset.id,
          key: asset.key,
          sources: [],
          fields: asset.custom?.fields || {},
          tags: asset.tags || [],
          image: '',
        };
        for (const source of asset.sources) {
          if (source.contentType?.startsWith('image/')) {
            image.sources.push(source);
          }
        }
        if (image.sources.length > 0) {
          image.image = image.sources[0].uri;
          images.push(image);
        }
      }
    }
  }
  return images;
}

const sendSingleBatchToAlgolia = (ctProducts, ctCategories, filename) => {
  let finalVariants = [];
  const fProducts = [];

  for (const ctProduct of ctProducts) {
    const k = ctProduct.categories.length;
    if (k != 0) {
      const parent_cat = ctCategories.filter(
        x => x.id == ctProduct.categories[k - 1].id
      )[0];
      ctProduct.categories.push(parent_cat.parent);
    }
  }

  for (const ctProduct of ctProducts) {
    ctProduct.alter_categories = {};
    ctProduct.hierarchicalCategories = {};

    for (const locale of config.locales) {
      ctProduct.alter_categories[locale] = [];
      ctProduct.hierarchicalCategories[locale] = [];
      ctProduct.name[locale] = getTranslation(locale, ctProduct.name);
    }

    ctProduct.variants.push(ctProduct.masterVariant);

    let varantIndex = 0;

    for (const ctVariant of ctProduct.variants) {
      if (ctVariant.prices) {
        for (const ctPrice of ctVariant.prices) {
          if (ctPrice.value.currencyCode == "USD")
            ctProduct.variants[varantIndex].price = ctPrice.value;
        }
      }

      for (const attr of config.varientAttributes) {
          ctProduct[attr] = [];
      }

      for (const ctVariantAttribute of ctVariant.attributes) {
        if (ctVariantAttribute.name == 'name') {
          for (const locale of config.locales) {
            ctVariantAttribute.value[locale] = getTranslation(locale, ctVariantAttribute.value);
          }
        }
        if (config.varientAttributes.includes(ctVariantAttribute.name)) {
          if (ctVariantAttribute.value.key) {
            ctProduct.variants[varantIndex][ctVariantAttribute.name] = ctVariantAttribute.value.key;
            if (!ctProduct[ctVariantAttribute.name].includes(ctVariantAttribute.value.key)) {
              ctProduct[ctVariantAttribute.name].push(ctVariantAttribute.value.key);
            }
          } else {
            ctProduct[ctVariantAttribute.name] = ctVariantAttribute.value;
          }
        }
      }

      varantIndex++;
    }

    for (const cat of ctProduct.categories) {
      if (cat) {
        const cat_data = ctCategories.filter(x => x.id == cat.id)[0];

        for (const locale of config.locales) {
          ctProduct.alter_categories[locale].push(cat_data.categories[locale]);
          ctProduct.hierarchicalCategories[locale].push(
            cat_data.hierarchicalCategories[locale]
          );
        }
      }
    }

    fProducts.push(ctProduct);
  }

  for (const fProduct of fProducts) {
    for (const variant of fProduct.variants) {
      const images = getImageAssets(variant);
      const resultdata = {
        objectID: variant.sku,
        parentId: fProduct.id,
        name: fProduct.name,
        description: fProduct.description,
        slug: fProduct.slug,
        sku: variant.sku,
        categories: fProduct.alter_categories,
        hierarchicalCategories: fProduct.hierarchicalCategories,
        price: variant.price,
        images
      };

      if (images.length) {
        resultdata.image = images[0].image;
      }

      for (const attr of config.varientAttributes) {
        resultdata[attr] = variant[attr];
      }

      finalVariants.push(resultdata);
    }
  }

  fse.ensureDirSync('./algolia_product_import');
  fs.writeFileSync('./algolia_product_import/' + filename, JSON.stringify(finalVariants));

  if (finalVariants.length) {
    pushToAlgolia({
      syncfrom: "Product",
      filename,
      data: finalVariants,
      indexname: config.algoliaProductIndexName,
      logger
    });
    finalVariants = [];
  }
};

const sendProductBatchFilesToAlgolia = () => {
  const jsonsInDir = fs
    .readdirSync("./data")
    .filter(file => path.extname(file) === ".json");
  const ctCategories = JSON.parse(fs.readFileSync(config.productCategoriesDumpFileName));

  jsonsInDir.forEach(filename => {
    const fileData = fs.readFileSync(path.join("./data", filename));
    const ctProducts = JSON.parse(fileData.toString());
    sendSingleBatchToAlgolia(ctProducts, ctCategories, filename);
  });
};

const CcustomExporter = new customExporter({
  apiConfig: config.commerceToolsAuth,
  exportConfig,
  logger
});

const outputStream = fs.createWriteStream(config.ctProductDumpFileName);

// Register error listener
outputStream.on("error", function(v) {
  logger.error(v);
});

fse.emptyDirSync("./data");

outputStream.on("finish", sendProductBatchFilesToAlgolia);

logger.info("Product Indexer Executing ..." + "\n");
console.time("Product Indexer code execution time:");
CcustomExporter.run(outputStream);

console.timeEnd("Product Indexer code execution time:");
