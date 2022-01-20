const express       = require( 'express' );
const MongoClient   = require('mongodb').MongoClient;

const typedefs      = require('./typedefs');


/**
 * 연결 객체 정보를 이용해 몽고디비 연결 및 캐싱
 * @param {app_connection} connection 
 * @param {express.Express} app 
 * @param {app_callback} callback 
 */
exports.addConnection = function ( connection, app, callback ) {
    if ( !app.locals.dbConnections ) // 저장소 생성
    {
        app.locals.dbConnections = [];
    }

    if ( !connection.connOptions ) // 기본 옵션 생성
    {
        connection.connOptions = {};
    }

    MongoClient.connect( connection.connString, connection.connOptions, function( err, client ) {

        if ( err )
        {
            callback( err, null );
        }
        else
        {
            let dbObj = {};
            dbObj.native        = client;
            dbObj.connString    = connection.connString;
            dbObj.connOptions   = connection.connOptions;

            app.locals.dbConnections[connection.connName] = null;
            app.locals.dbConnections[connection.connName] = dbObj;
            callback( null, dbObj );
        }
    });
};

/**
 * 
 * @param {string} connection 
 * @param {express.Express} app 
 * @returns {void}
 */
exports.removeConnection = function ( connection, app ) {
    if ( !app.locals.dbConnections ) {
        app.locals.dbConnections = [];
    }

    try
    {
        app.locals.dbConnections[connection].native.close();
    }
    catch ( err )
    {
        //
    }

    delete app.locals.dbConnections[connection];
    return;
};
