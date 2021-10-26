import CategoryExporter from "@commercetools/category-exporter";
import fs from "fs";
import { pushToAlgolia } from "./pushToAlgolia.js";
import { logger, getTranslation } from "./utils.js";
import config from "./config.js";
import util from 'util';

const categoryExporter = new CategoryExporter.default({ apiConfig: config.commerceToolsAuth }, logger);

const outputStream = fs.createWriteStream(config.ctCategoryDumpFileName);

const makeCategoryMap = categories => categories.reduce((acc, cat) => ({...acc, [cat.id]: cat }), {});

const writeFile = (fileName, data) => {
  fs.writeFile(
    fileName,
    JSON.stringify(data),
    "utf8",
    function(err) {
      if (err) {
        logger.error(err);
      }
    }
  );
}

const makeCategories = (ctCategories, categoryMap) => {
  const productImporterCategories = [];
  const algoliaCategories = [];

  for (const ctCategory of ctCategories) {
    const algoliaCategory = {
      id: ctCategory.id,
      version: ctCategory.version,
      name: ctCategory.name,
      objectID: ctCategory.id,
      path: {},
      slug: {},
    };
    const productImporterCategory = {
      id: ctCategory.id,
      categories: {},
      hierarchicalCategories: {},
    };

    const current = { typeId: "category", id: ctCategory.id }

    for (const locale of config.locales) {
      productImporterCategory.categories[locale] = {};
      productImporterCategory.hierarchicalCategories[locale] = {};
      algoliaCategory.name[locale] = getTranslation(locale, algoliaCategory.name);
      const slugArray = [];
      const pathArray = [];

      for (const ancestor of [...ctCategory.ancestors, current]) {
        const ancestorCategory = categoryMap[ancestor.id];
        const name = getTranslation(locale, ancestorCategory.name);
        const slug = getTranslation(locale, ancestorCategory.slug);

        if (name) {
          pathArray.push(name);
        } else {
          logger.error(`failed to find name for locale ${locale}`, ancestorCategory);
          process.exit(1);
        }

        if (slug) {
          slugArray.push(slug);
        } else {
          logger.error(`failed to find slug for locale ${locale}`, ancestorCategory);
          process.exit(1);
        }

        productImporterCategory.hierarchicalCategories[locale]['lvl' + (pathArray.length - 1)] = pathArray.join(' > ');
      }

      if (pathArray.length) {
        productImporterCategory.categories[locale].path = pathArray.join(' > ');
        algoliaCategory.path[locale] = pathArray.join(' > ');
      }

      if (slugArray.length) {
        productImporterCategory.categories[locale].slug = slugArray.join('/');
        algoliaCategory.slug[locale] = slugArray.join('/');
      }
    }

    productImporterCategories.push(productImporterCategory);
    algoliaCategories.push(algoliaCategory);
  }

  return { productImporterCategories, algoliaCategories };
}

// Register error listener
outputStream.on("error", v => logger.error(v));

outputStream.on("finish", () => {
  fs.readFile(config.ctCategoryDumpFileName, "utf8", (err, data) => {
    if (err) {
      logger.error(err);
      return;
    }

    const ctCategories = JSON.parse(data);
    const categoryMap = makeCategoryMap(ctCategories);
    const { algoliaCategories, productImporterCategories } = makeCategories(ctCategories, categoryMap);

    writeFile(config.productCategoriesDumpFileName, productImporterCategories);
    writeFile(config.categoryDebugDumpFileName, algoliaCategories);

    if (false && algoliaCategories) {
      pushToAlgolia({
        syncfrom: "category",
        filename: config.categoryDebugDumpFileName,
        data: algoliaCategories,
        indexname: config.algoliaCategoryIndexName,
        logger
      });
    }
  });
});

logger.info("Category Indexer Executing");
console.time("Category Indexer code execution time:");
categoryExporter.run(outputStream);
console.timeEnd("Category Indexer code execution time:");
