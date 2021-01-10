var config = {
  init: async function(){
    this.result = await conn.query("SELECT * FROM config WHERE id = 1;",[])
  },
  result: {}
}


global.config = config;
