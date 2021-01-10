const mysql = require('mysql2/promise');

var connection;
var conn = {
  init: async function() {
    console.log("Init MySQL connection.")
    connection = await mysql.createConnection({
      host: '',
      user: '',
      password: '',
      database: ''
    });
  },
  query: async function(query, data) {
    const [rows, fields] = await connection.execute(query, data);
    return rows
  }
}
global.conn = conn;
