import dotenv from "dotenv";
dotenv.config();
import algoliasearch from 'algoliasearch'

export async function sendtoalgolia(startBatching, endBatching, endSync, syncfrom, filename, data, indexname) {
    try {
        const client = algoliasearch(process.env.ALGOLIA_PROJECT_ID, process.env.ALGOLIA_WRITE_KEY, {
            timeouts: {
                connect: process.env.ALGOLIA_CONNECT_TIMEOUT,
                read: process.env.ALGOLIA_READ_TIMEOUT,
                write: process.env.ALGOLIA_WRITE_TIMEOUT,
                dns: process.env.ALGOLIA_DNS_TIMEOUT
            },

        }, );
        const index = client.initIndex(indexname)
        await index
            .saveObjects(data, { autoGenerateObjectIDIfNotExist: true })
            .wait()
            .then(() => {
                endSync = new Date() - startBatching;
                console.log(syncfrom + " : " + filename + " sync time: " + (endBatching + endSync) / 1000 + 's' + '\n');

            })
            .catch(err => {
                console.log(startBatching, endBatching, endSync, syncfrom, filename, indexname, 'test', err);
            })

    } catch {
        console.log("network error")
    }
}