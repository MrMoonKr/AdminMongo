const express       = require( 'express' );
const MongoClient   = require('mongodb').MongoClient;

/**
 * 연결 개체 타입 정의
 * @typedef {Object} Connection
 * @property {string} connName 
 * @property {string} connString 
 * @property {Object} connOptions 
 */

/**
 * 연결 객체 정보를 이용해 몽고디비 연결 및 캐싱
 * @param {Connection} connection 
 * @param {express.Express} app 
 * @param {Function} callback 
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
 * @param {Connection} connection 
 * @param {express.Express} app 
 * @returns 
 */
exports.removeConnection = function (connection, app){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    try{
        app.locals.dbConnections[connection].native.close();
    }catch(e){}

    delete app.locals.dbConnections[connection];
    return;
};
