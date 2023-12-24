const mongoClient = require('mongodb').MongoClient;
let dbInstance;


async function initDB() {
    const dbUrl = "mongodb+srv://myatthihanaing:Study102910!@mymongocluster.iqkgobi.mongodb.net/?retryWrites=true&w=majority";
    const dbName = "WebRTC_Meeting_APP";
    const collectionName = "meetings";
  
    try {
      const client = await mongoClient.connect(dbUrl);
      const db = client.db(dbName);
      const collectionExists = db.listCollections({name: collectionName}).hasNext();

      if(!collectionExists){
        await db.createCollection(collectionName);
        console.log("meeting collection created...");
      }else{
        console.log("meeting collection already existed");
      }
      dbInstance = db;
    } catch (error) {
      console.log(error);
      throw error; 
    }
}

function getdb(){
    return dbInstance;
}



module.exports = {
    "initDb" : initDB,
    "db" : getdb
}