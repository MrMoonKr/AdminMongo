


/**
 * MongoDB 접속 URI 파싱 결과 저장 객체.  
 * 'mongodb-uri' 모듈 파싱 객체 대체. 타입정보 제공하지 않아서.
 * @typedef {Object} app_mongouri
 * @property {string} username
 * @property {string} password
 * @property {string} hosts
 * @property {string} ports
 * @property {string} database
 * @property {string} options
 */


/**
 * @callback app_callback 앱레벨 콜백함수 시그너쳐
 * @param {string} err 에러문자열
 * @param {object} res 결과객체
 * @returns {void}
 */

/**
 * 연결 개체 타입 정의
 * @typedef {Object} app_connection
 * @property {string} connName 
 * @property {string} connString 
 * @property {Object} connOptions 
 */

