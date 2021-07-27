import dotenv from "dotenv";
dotenv.config();
import algoliasearch from 'algoliasearch'
const client = algoliasearch(process.env.ALGOLIA_PROJECT_ID, process.env.ALGOLIA_WRITE_KEY);

export async function sendtoalgolia(startBatching, endBatching, endSync, syncfrom, filename, data, indexname) {
    try {
        const index = client.initIndex(indexname)
        await index
            .saveObjects(data, { autoGenerateObjectIDIfNotExist: true })
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