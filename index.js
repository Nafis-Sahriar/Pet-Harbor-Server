const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, MongoOperationTimeoutError } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.MONGO_DB_URI;

const express = require('express');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
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

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const jwtVerifyToken = async (req,res,next)=>
{
     

      const authHeader = req?.headers.authorization

      if(!authHeader)
      {
        return  res.status(401).json({
          message:"Unauthorized"
        })
      }

      const token = authHeader.split(" ")[1]
      if(!token)
      {
        return res.status(401).json({
          message:"Unauthorized"
        })
      }

      try{
        const {payload} = await jwtVerify(token, JWKS)
        next()
        // console.log(payload)
      }
      catch(error)
      {
        return res.status(403).json({
          message:"Forbidden"
        });
      }

      // console.log(token)
      
}

async function run() {
  try {
 
    await client.connect();

    const db = client.db('a09db');

    const allPetCollection = db.collection('allPets');
    const adoptionRequestCollection = db.collection('adoptionRequests');
    const wishListCollection = db.collection('wishlist');
    
    // Here I will implement a post api to add pet in the database, which can only be added by users. No hardcoded json data will be stored in my db.

    app.post('/addPet',jwtVerifyToken, async(req,res)=>{

      const petData = req.body;
      const result = await allPetCollection.insertOne(petData);
      res.json(result);

    })

    app.post('/adoptionRequest',jwtVerifyToken, async(req,res)=>{

      const requestData = req.body;
      const result = await adoptionRequestCollection.insertOne(requestData);
      res.json(result);

    })

    // Ekta get API lagbe , pet id niye oi pet er sob request dekhanor jonno.

    app.get('/requestsOfPet/:petId',jwtVerifyToken, async(req,res) => {

      const petId = req.params.petId;
      const query = {
        petId: petId
      };
      const result = await adoptionRequestCollection.find(query).toArray();
      res.json(result);
    });

    app.delete('/deleteRequest/:id',jwtVerifyToken, async(req,res) => {

      const id = req.params.id;

      const query = {

        _id: new ObjectId(id)

      };
      
      const result = await adoptionRequestCollection.deleteOne(query);
      res.json(result);
    })


    //Ebar ekta api banate hobe , accept action handle korar jonno, ekhane ami first of all, 
    // all request theke request id diye particular request ta ene oitar status accepted kore dbo, 
    // then oi request er pet id niye, all pet collection e giye oi pet er adoption status ta available theke adopted kore dbo.



    app.patch('/acceptRequest/:id',jwtVerifyToken, async(req,res) => {

            const id = req.params.id;
            const {petId} = req.body;

            const query ={_id: new ObjectId(id)};

            await adoptionRequestCollection.updateOne(
              query,     
            {
              $set:{
                requestStatus:"accepted"
              }
            });

            await adoptionRequestCollection.updateMany(
              {
                petId:petId,
                _id:{$ne: new ObjectId(id)}
              },
              {
                $set:{
                  requestStatus:"rejected"
                }
              }

            )

            await allPetCollection.updateOne(
              {
                  _id: new ObjectId(petId)
              },
              {
                $set:{
                  adoptionStatus: "adopted"
                }
              }
            )

        return res.json({message: "Request accepted Succesfuly"});

     
    });

    // Ebar reject api banate hobe. 
    app.patch('/rejectRequest/:id',jwtVerifyToken, async(req,res)=>{

            const id = req.params.id;

            const _id= new ObjectId(id);

            const result = await adoptionRequestCollection.updateOne(
              {
                _id
              },
              {
                 $set:{
                  requestStatus:'rejected'
                 }
              }
            );

            return res.json(result);
    })


    // Here I will implement a get api to get all the pets from the database, which can be accessed by users.
    // a non user can also see my all pets, thats why i should not jwt verify this.
    app.get('/allPets', async(req,res)=>{

       
      const {search} = req.query;

      let cursor;

      if(search)
      {
        // jodi search thake, 
        cursor = await allPetCollection.find({
         $or:[
                            {
                              // first , pet name diye, 

                              petName:{
                                    $regex:search,
                                    $options:'i'
                              }
                            },

                            // {
                            //   // breed diye
                            //   breed:{
                            //     $regex:search,
                            //     $options:'i'
                            //   }
                            // }
                            // breed apatoto bad dei, karon beshi card show kore fele.
          
         ]

      })}

      else
      {
        cursor = allPetCollection.find();
      }

      const result = await cursor.toArray();

      res.json(result);

    })

    // I will delete a pet here, 
    app.delete('/deletePet/:id',jwtVerifyToken, async (req, res)=>{
      const id = req.params.id;

      const query = {

        _id: new ObjectId(id)
      };

      const result = await allPetCollection.deleteOne(query);
      res.json(result);
    })


    // Update pet details API 
    app.patch('/updatePet/:id',jwtVerifyToken, async(req,res) => {

      const id = req.params.id;
      const updatedData = req.body;

      const result = await allPetCollection.updateOne(
        {
            _id: new ObjectId(id)
        },
        {
          $set: updatedData
        }
      );
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

    app.get('/allPets/:id', jwtVerifyToken ,async(req, res) => 
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

  app.get('/adoptionRequest/check',jwtVerifyToken, async(req,res)=>{

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



app.get('/myRequests/:id',jwtVerifyToken, async(req, res) => {

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

  app.get('/allPetOfOwner/:ownerId',jwtVerifyToken, async (req, res)=>{

    const ownerId = req.params.ownerId;
    const result = await allPetCollection.find({ownerId: ownerId}).toArray();
    res.json(result);

  } )


  // wishLIst er jonno api banate hobe. 

  app.post('/addToWishlist',jwtVerifyToken, async (req, res)=>{

       const wishListData = req.body;

       // already ache kina check korte hobe.

       const alreadyAche = await wishListCollection.findOne({
        petId:wishListData.petId,
        userId: wishListData.userId
       })

       if(alreadyAche)
       {
           return res.json({
            message:"Already in WishList!"
           })
       }

       const result = await wishListCollection.insertOne(wishListData);

      return res.json(result);

  })


  app.get('/wishList/:id',jwtVerifyToken, async(req, res)=>{

        const userId = req.params.id;

        const query={
             userId:userId
        }

        const result = await wishListCollection.find(query).toArray();

        return res.json(result);

  })

  app.delete('/removeFromWishList/:id',jwtVerifyToken, async(req,res)=>{

        const id = req.params.id;

        const result = await wishListCollection.deleteOne({
          _id: new ObjectId(id)
        })

      return res.json(result);

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
