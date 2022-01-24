const _             = require('lodash');
const fs            = require('fs');
const path          = require('path');

const express       = require('express');
const mongodb       = require('mongodb');
const MongoUri      = require('mongo-uri');

const typedefs      = require('../typedefs');

/**
 * 관리자 계정 로그인 체크. 설정파일에 password 추가시 동작
 * checks for the password in the /config/app.json file if it's set
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {*} next 
 */
exports.checkLogin = function ( req, res, next ) 
{
    var passwordConf = req.nconf.app.get('app');

    // only check for login if a password is specified in the /config/app.json file
    if ( passwordConf && passwordConf.hasOwnProperty('password') ) 
    {
        // dont require login session for login route
        if ( req.path === '/app/login' || req.path === '/app/logout' || req.path === '/app/login_action' ) {
            next();
        }
        else
        {
            // if the session exists we continue, else renter login page
            if ( req.session.loggedIn ) 
            {
                next(); // allow the next route to run
            }
            else 
            {
                res.redirect( req.app_context + '/app/login' );
            }
        }
    }
    else
    {
        // no password is set so we continue
        next();
    }
};

/**
 * @callback ErrResCallback 앱레벨 콜백함수 시그너쳐
 * @param {string}} err 에러문자열
 * @param {object} res 결과객체
 * @returns {void}
 */


/**
 * Admin.serverStatus() 랩퍼 함수.
 * gets some db stats
 * @param {mongodb.MongoClient} mongoClient MongoClient
 * @param {ErrResCallback} cb 
 */
exports.get_db_status = function ( mongoClient, cb ) {

    const adminDB = mongoClient.db().admin();
    adminDB.serverStatus( function ( err, status ) {
        if ( err )
        {
            cb( 'Error', null );
        }
        else
        {
            cb( null, status );
        }
    });
};

// gets the backup dirs
exports.get_backups = function( cb ) {
    var junk = require('junk');
    var backupPath = path.join( __dirname, '../backups' );

    fs.readdir( backupPath, function ( err, files ) {
        cb( null, files.filter( junk.not ) );
    });
};
 
/**
 * gets the db stats
 * @param {mongodb.MongoClient} mongo_client 
 * @param {string} db_name 
 * @param {app_callback} cb 
 */
exports.get_db_stats = function ( mongo_client, db_name, cb ) {
    var async = require('async');
    var db_obj = {};

    if ( db_name == null ) // if at connection level we loop db's and collections
    {
        const adminDB = mongo_client.db().admin();
        adminDB.listDatabases( function ( err, db_list ) {
            if ( err ) {
                cb( 'User is not authorised', null );
                return;
            }

            if ( db_list !== undefined )
            {
                async.forEachOf( exports.order_object( db_list.databases ), 
                    function ( value, key, callback ) {
                        exports.order_object( db_list.databases );
                        var skipped_dbs = ['null', 'admin', 'local'];
                        if ( skipped_dbs.indexOf( value.name ) === -1 )
                        {
                            var tempDBName = value.name;
                            mongo_client.db( tempDBName ).listCollections().toArray( function ( err, coll_list ) {
                                var coll_obj = {};
                                async.forEachOf( exports.cleanCollections( coll_list ),
                                    function ( value, key, callback ) {
                                        mongo_client.db( tempDBName ).collection( value ).stats( function ( err, coll_stat ) {
                                            coll_obj[value] = { 
                                                Storage: coll_stat.size,
                                                Documents: coll_stat.count
                                            };

                                            callback();
                                        });
                                    }, 
                                    function ( err ) {
                                        if ( err ) console.error( err.message );
                                        // add the collection object to the DB object with the DB as key
                                        db_obj[value.name] = exports.order_object( coll_obj );
                                        
                                        callback();
                                    }
                                );
                            });
                        }
                        else
                        {
                            callback();
                        }
                    }, 
                    function ( err ) {
                        if ( err ) console.error( err.message );
                        // wrap this whole thing up
                        cb( null, exports.order_object( db_obj ) );
                    }
                );
            }
            else
            {
                // if doesnt have the access to get all DB's
                cb( null, null );
            }
        });
        // if at DB level, we just grab the collections below
    }
    else
    {
        mongo_client.db(db_name).listCollections().toArray(function (err, coll_list){
            var coll_obj = {};
            async.forEachOf(exports.cleanCollections(coll_list), function (value, key, callback){
                mongo_client.db(db_name).collection(value).stats(function (err, coll_stat){
                    coll_obj[value] = {
                        Storage: coll_stat ? coll_stat.size : 0,
                        Documents: coll_stat ? coll_stat.count : 0
                    };

                    callback();
                });
            }, function (err){
                if(err) console.error(err.message);
                db_obj[db_name] = exports.order_object(coll_obj);
                cb(null, db_obj);
            });
        });
    }
};

/**
 * 데이터베이스 목록 조회하기. 콜백에게 DB이름목록이 전달된다
 * @param {app_mongouri} uri 
 * @param {mongodb.MongoClient} mongo_db 
 * @param {ErrResCallback} cb 
 */
exports.get_db_list = function ( uri, mongo_db, cb ) {
    const async     = require('async');
    const adminDB   = mongo_db.db().admin();
    let db_arr      = [];

    if ( uri.database === undefined || uri.database === null ) // if a DB is not specified in the Conn string we try get a list
    {
        adminDB.listDatabases( function ( err, db_list ) { // try go all admin and get the list of DB's
            if ( db_list !== undefined ) 
            {
                async.forEachOf( db_list.databases, 
                    function ( value, key, callback ) {
                        const skipped_dbs = ['null', 'admin', 'local'];
                        if ( skipped_dbs.indexOf( value.name ) === -1 ) {
                            db_arr.push( value.name );
                        }
                        callback();
                    }, 
                    function ( err ) { 
                        if ( err ) console.error( err.message );
                        exports.order_array( db_arr );
                        cb( null, db_arr );
                    }
                );
            }
            else
            {
                cb( null, null );
            }
        });
    }
    else
    {
        cb( null, null );
    }
};

// Normally you would know how your ID's are stored in your DB. 
// As the _id value which is used to handle
// all document viewing in adminMongo is a parameter we dont know if it is an ObjectId, string or integer. We can check if
// the _id string is a valid MongoDb ObjectId but this does not guarantee it is stored as an ObjectId in the DB. It's most likely
// the value will be an ObjectId (hopefully) so we try that first then go from there

/**
 * 
 * @param {mongodb.Db} mongo 
 * @param {string} collection 
 * @param {*} doc_id 
 * @param {ErrResCallback} cb 
 */
exports.get_id_type = function ( mongo, collection, doc_id, cb ) {
    if ( doc_id )
    {
        const ObjectId = require('mongodb').ObjectId;
        // if a valid ObjectId we try that, then then try as a string
        if ( ObjectId.isValid( doc_id ) )
        {
            mongo.collection(collection).findOne({_id: ObjectID(doc_id)}, function ( err, doc ) {
                if ( doc )
                {
                    // doc_id is an ObjectId
                    cb( null, {'doc_id_type': ObjectID(doc_id), 'doc': doc} );
                }
                else
                {
                    mongo.collection(collection).findOne({_id: doc_id}, function ( err, doc ) {
                        if ( doc )
                        {
                            // doc_id is string
                            cb( null, {'doc_id_type': doc_id, 'doc': doc} );
                        }
                        else
                        {
                            cb( 'Document not found', {'doc_id_type': null, 'doc': null} );
                        }
                    });
                }
            });
        }
        else
        {
            // if the value is not a valid ObjectId value we try as an integer then as a last resort, a string.
            mongo.collection(collection).findOne({_id: parseInt(doc_id)}, function ( err, doc ) {
                if ( doc ) 
                {
                    // doc_id is integer
                    cb( null, {'doc_id_type': parseInt(doc_id), 'doc': doc});
                    return;
                }
                else
                {
                    mongo.collection(collection).findOne({_id: doc_id}, function ( err, doc ) {
                        if ( doc ) 
                        {
                            // doc_id is string
                            cb(null, {'doc_id_type': doc_id, 'doc': doc});
                        }
                        else
                        {
                            cb('Document not found', {'doc_id_type': null, 'doc': null});
                        }
                    });
                }
            });
        }
    }
    else
    {
        cb( null, {'doc_id_type': null, 'doc': null } );
    }
};

// gets the Databases and collections
/**
 * MongoClient로 부터 특정 DB의 컬렉션을 조회
 * @param {mongodb.MongoClient} mongo_client 
 * @param {string} db_name 
 * @param {ErrResCallback} cb 
 */
exports.get_sidebar_list = function ( mongo_client, db_name, cb ) {
    var async = require('async');
    var db_obj = {};

    if ( db_name == null ) // if no DB is specified, we get all DBs and collections
    {
        //var adminDB = mongo_db.admin();
        var adminDB = mongo_client.db().admin();
        adminDB.listDatabases( function ( err, db_list ) {
            if ( db_list ) 
            {
                async.forEachOf( db_list.databases, 
                    function ( value, key, callback ) {
                        var skipped_dbs = ['null', 'admin', 'local'];
                        if ( skipped_dbs.indexOf( value.name ) === -1 )
                        {
                            mongo_client.db( value.name ).listCollections().toArray( function ( err, collections ) {
                                collections = exports.cleanCollections( collections );
                                exports.order_array( collections );
                                db_obj[value.name] = collections;
                                callback();
                            });
                        }
                        else
                        {
                            callback();
                        }
                    }, 
                    function ( err ) {
                        if ( err ) console.error( err.message );
                        cb( null, exports.order_object( db_obj ) );
                    }
                );
            }
            else 
            {
                cb( null, exports.order_object( db_obj ) );
            }
        });
    }
    else
    {
        mongo_client.db( db_name ).listCollections().toArray( function ( err, collections) {
            collections = exports.cleanCollections( collections );
            exports.order_array( collections );
            db_obj[db_name] = collections;
            cb( null, db_obj );
        });
    }
};

// order the object by alpha key
exports.order_object = function(unordered){
    if(unordered !== undefined){
        var ordered = {};
        var keys = Object.keys(unordered);
        exports.order_array(keys);
        keys.forEach(function (key){
            ordered[key] = unordered[key];
        });
    }
    return ordered;
};

exports.order_array = function(array){
    if(array){
        array.sort(function (a, b){
            a = a.toLowerCase();
            b = b.toLowerCase();
            if(a === b)return 0;
            if(a > b)return 1;
            return-1;
        });
    }
    return array;
};

/**
 * 에러페이지 렌더링. /views/error.hbs
 * @param {express.Response} res 응답객체
 * @param {express.Request} req 요청객체
 * @param {string} err 에러메시지
 * @param {string} conn 연결키 문자열
 */
exports.render_error = function( res, req, err, conn ) {
    var connection_list = req.nconf.connections.get('connections');

    var conn_string = '';
    if(connection_list[conn] !== undefined){
        conn_string = connection_list[conn].connection_string;
    }

    res.render( 'error', {
        message: err,
        conn: conn,
        conn_string: conn_string,
        connection_list: exports.order_object(connection_list),
        helpers: req.handlebars.helpers
    });
};

/**
 * 컬렉션목록으로 부터 컬렉션이름목록 추출
 * @param {mongodb.CollectionInfo} collection_list 
 * @returns {string[]} 컬렉션 이름 배열
 */
exports.cleanCollections = function( collection_list ) {
    const list = [];
    _.each( collection_list, function ( item ) {
        list.push( item.name );
    });
    return list;
};
