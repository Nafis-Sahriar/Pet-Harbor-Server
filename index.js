const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const adoptionRequestCollection = db.collection('adoptionRequests');
    
    // Here I will implement a post api to add pet in the database, which can only be added by users. No hardcoded json data will be stored in my db.

    app.post('/addPet', async(req,res)=>{

      const petData = req.body;
      const result = await allPetCollection.insertOne(petData);
      res.json(result);

    })

    app.post('/adoptionRequest', async(req,res)=>{

      const requestData = req.body;
      const result = await adoptionRequestCollection.insertOne(requestData);
      res.json(result);

    })

    // Here I will implement a get api to get all the pets from the database, which can be accessed by users.

    app.get('/allPets', async(req,res)=>{
      const result = await allPetCollection.find().toArray();
      res.json(result);
    })

    // I will delete a pet here, 
    app.delete('/deletePet/:id', async (req, res)=>{
      const id = req.params.id;
      
      const query = {

        _id: new ObjectId(id)
      };

      const result = await allPetCollection.deleteOne(query);
      res.json(result);
    })

    app.get('/featuredPets', async(req, res) => 
    {
           const result = await allPetCollection.find(
            {
              adoptionStatus: "available"
            }
            ).limit(6).toArray();

            res.json(result);

    });

    app.get('/allPets/:id', async(req, res) => 
    {
    const id = req.params.id;

    const query = {
        _id: new ObjectId(id)
    };
    const result = await allPetCollection.findOne(query);

    res.json(result);

});


    // now I will implement a get api to render the request status
    // implementing Query parameter to check the request status.

  app.get('/adoptionRequest/check', async(req,res)=>{

   const petId = req.query.petId;
   const requesterId = req.query.requesterId;

   const query = 
   {
      petId: petId,
      requesterId: requesterId
   };

   const result = await adoptionRequestCollection.findOne(query);
   res.json(result);

})



app.get('/myRequests/:id', async(req, res) => {

    const id = req.params.id;

    const query = {
      requesterId: id
    };

    const result = await adoptionRequestCollection.find(query).toArray();
    res.json(result);

});

// Ekhon amake individual user koyta pet list koreche, oi data dekhate hobe.
// tahole ami jodi ekta api banai, pet list korar jonno, ar query parameter hishebe user id dei, tahole oi user
// koyta pet list koreche, eta dekhte parbo. ok fine, then, abar oi pet card er moddhe button thakbe , details dekhanor, eta ami id pass kore
// details page theke dekhiye dite parbo. ok fine, Then arekta buttont hakbe , delete er, list theke delete er, tahole delete method call kore dilei hobe. 
// then abar arekta button thakbe edit er, tw oita edit optionroute e pathiye dibo. 
// last ekta button thakbe show requests. ekhane amar pet wise all request dekhate hobe, tw tokhon ekta api call korbo, ar query parameter hishebe
// pet id pass kore dibo, then request collection theke oi pet er joto requests ache, oigula dekhiye dibo. In sha Allah. 



   // first, Show the pet listing, 

  app.get('/allPetOfOwner/:ownerId', async (req, res)=>{

    const ownerId = req.params.ownerId;
    const result = await allPetCollection.find({ownerId: ownerId}).toArray();
    res.json(result);

  } )
      


   



  
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
