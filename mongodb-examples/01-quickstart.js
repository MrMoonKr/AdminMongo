

const mongodb           = require('mongodb');
const MongoClient       = mongodb.MongoClient;

const url               = 'mongodb://localhost/test';
const client            = new MongoClient( url );

const dbName            = 'db';

async function main()
{
    try
    {
        await client.connect();

        const database  = client.db('db');
        const collection= database.collection('user-info');

        const query     = { userType: 'stu' };

        const student   = await collection.findOne( query );
        console.log( student );

        const students  = await collection.find( query );
        //console.log( students );
        students.forEach( doc => {
            //console.log( doc.username );
        })
    }
    catch
    {
        await client.close();
    }
}

console.log( "start example !!!" );

main().then( () => {
    console.log('main.then() called');
}).catch( ( err ) => {
    console.log('main.catch() called');
}).finally( () => {
    console.log('main.finally() called');
    console.log( "done examples !!!");

    process.exit();
});

