import _sdkClient from "@commercetools/sdk-client";
import _apiRequestBuilder from "@commercetools/api-request-builder";
import _sdkMiddlewareHttp from "@commercetools/sdk-middleware-http";
import _sdkMiddlewareAuth from "@commercetools/sdk-middleware-auth";
import _sdkMiddlewareUserAgent from "@commercetools/sdk-middleware-user-agent";
import JSONStream from "JSONStream";
import _nodeFetch from "node-fetch";
import fs from "fs";

export default class customExporter {
  // Set flowtype annotations
  constructor(apiConfig, exportConfig, logger, accessToken) {
    this.apiConfig = apiConfig;
    this.client = (0, _sdkClient.createClient)({
      middlewares: [
        (0, _sdkMiddlewareAuth.createAuthMiddlewareForClientCredentialsFlow)({
          ...this.apiConfig,
          fetch: _nodeFetch.default
        }),
        (0, _sdkMiddlewareUserAgent.createUserAgentMiddleware)({
          libraryName: "customExporter",
          libraryVersion: "1.0.0"
        }),
        (0, _sdkMiddlewareHttp.createHttpMiddleware)({
          host: this.apiConfig.apiUrl,
          enableRetry: true,
          fetch: _nodeFetch.default
        })
      ]
    });
    const defaultConfig = {
      staged: false,
      json: true
    };
    this.exportConfig = { ...defaultConfig, ...exportConfig };
    this.logger = {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      ...logger
    };
    this.accessToken = accessToken;
  }

  run(outputStream) {
    //this.logger.debug('Starting Export');

    const formattedStream = customExporter._getStream("json");

    //this.logger.debug('Preparing outputStream');
    formattedStream.pipe(outputStream);
    return this._getProducts(formattedStream).catch(e => {
      this.logger.error(e, "Oops. Something went wrong");
      outputStream.emit("error", e);
    });
  }

  _getProducts(outputStream) {
    //this.logger.debug('Building request');
    let count = 1;
    const uri = customExporter._buildProductProjectionsUri(
      this.apiConfig.projectKey,
      this.exportConfig
    );

    const request = {
      uri,
      method: "GET"
    };
    if (this.accessToken)
      request.headers = {
        Authorization: `Bearer ${this.accessToken}`
      };
    const processConfig = {
      accumulate: false
    };
    if (this.exportConfig.total) processConfig.total = this.exportConfig.total;
    //this.logger.debug('Dispatching request');
    return this.client
      .process(
        request,
        ({ body: { results: products } }) => {
          //this.logger.debug(`Fetched ${products.length} products`);

          customExporter._writeEachProduct(outputStream, products);

          //this.logger.debug(`${products.length} products written to outputStream`);

          if (products.length < 1) {
            return Promise.reject(Error("No products found"));
          }
          const jsonString = JSON.stringify(products);
          fs.writeFile(`./data/batch${count++} .json`, jsonString, err => {
            if (err) {
              console.log("Error writing file", err);
            } else {
              //console.log('Successfully wrote file')
            }
          });

          return Promise.resolve();
        },
        processConfig
      )
      .then(() => {
        outputStream.end();
        //this.logger.info('Export operation completed successfully');
        this.logger.info("-----------------------------------------");
      });
  }

  static _buildProductProjectionsUri(projectKey, exportConfig) {
    var _exportConfig$expand;

    const service = (0, _apiRequestBuilder.createRequestBuilder)({
      projectKey
    }).productProjections;
    service.staged(exportConfig.staged);
    if (exportConfig.batch) service.perPage(exportConfig.batch);
    if (exportConfig.predicate) service.where(exportConfig.predicate); // Handle `expand` separately because it's an array

    if (
      (_exportConfig$expand = exportConfig.expand) === null ||
      _exportConfig$expand === void 0
        ? void 0
        : _exportConfig$expand.length
    )
      exportConfig.expand.forEach(reference => {
        service.expand(reference);
      });
    return service.build();
  }
  /* if the exportFormat is json, prepare the stream for json data. If
        csv, also create a json stream because it needs to pass text to
        the stdout.
        */

  static _getStream(exportType) {
    return exportType === "json"
      ? JSONStream.stringify("[\n", ",\n", "\n]")
      : JSONStream.stringify(false);
  }
  /* the `any` hack is necessary to  make flow work because there is no
        JSONStream type definition at the moment and this is not a regular
        stream hence the type "stream$Writable" is not fully compatible.
        */

  static _writeEachProduct(outputStream, products) {
    products.forEach(product => {
      outputStream.write(product);
    });
  }
}
