

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

        //const adminDB     = client.admin(); // 4.x 에서 없음

        const database  = client.db('db');
        const adminDB   = database.admin();

        adminDB.serverStatus( ( err, res ) => {
            console.log( res );
        });

        adminDB.listDatabases( ( err, res ) => {
            console.log( res );
        });
    }
    catch ( err )
    {
        console.log( err );
        await client.close();
    }
}

console.log( "start example !!!" );

main().then( ( doc ) => {
    console.log('main.then() called');
}).catch( ( err ) => {
    console.log('main.catch() called');
}).finally( () => {
    console.log('main.finally() called');
    console.log( "done examples !!!");

    //process.exit();
});

