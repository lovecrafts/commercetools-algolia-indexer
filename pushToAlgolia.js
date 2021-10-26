import algoliasearch from "algoliasearch";
import config from './config.js';

export async function pushToAlgolia({
  filename,
  data,
  indexname,
  logger
}) {
  const client = algoliasearch(
    config.algoliaProjectId,
    config.algoliaWriteKey,
    {
      timeouts: {
        connect: config.algoliaConnectTimeout,
        read: config.algoliaReadTimeout,
        write: config.algoliaWriteTimeout,
        dns: config.algoliaDnsTimeout
      }
    }
  );
  const index = client.initIndex(indexname);
  const start = new Date();
  logger.info(`sending ${filename} to Algolia`);
  await index
    .saveObjects(data, { autoGenerateObjectIDIfNotExist: true })
    .wait()
    .then(() => {
      const end = new Date();
      logger.info(`finished sending ${filename} in ${(end - start) / 1000}s`);
    })
    .catch(err => {
      logger.error(
        filename,
        indexname,
        err
      );
    });
}
