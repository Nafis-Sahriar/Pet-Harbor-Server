const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.MONGO_DB_URI;

const express = require('express');
const app = express();
const PORT = process.env.PORT || 6000;
app.use(cors());
app.use(express.json());  

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/', (req, res) => {
    res.send('SERVER IS RUNNING');
});


async function run() {
  try {
 
    await client.connect();

    const db = client.db('a09db');

    const allPetCollection = db.collection('allPets');
    
    // Here I will implement a post api to add pet in the database, which can only be added by users. No hardcoded json data will be stored in my db.

    app.post('/addPet', async(req,res)=>{

      const petData = req.body;
      const result = await allPetCollection.insertOne(petData);
      res.json(result);

    })

    
   
    await client.db("admin").command({ ping: 1 });




    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
