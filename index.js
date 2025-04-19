const express = require("express");
require("dotenv").config();
const app = new express();
const cors = require("cors");
const compression = require('compression');
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 600 });
app.use(compression())
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extends: true }))





const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://ishanrana950:Xi9Qot1VD3BjGk31@cluster0.5xmvgk6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("e-commerce");
        const userCollection = database.collection("user");
        const productCollection = database.collection("product");
        const orderCollection = database.collection("order")


        await userCollection.createIndex({email:1},{unique:true});
        await productCollection.createIndex({category:1});
        await orderCollection.createIndex({orderDate:-1});
        await orderCollection.createIndex({userId:1});
        await userCollection.createIndex({lastLogin:-1});
        await productCollection.createIndex({stock:1});

        app.get("/api/v1/dashboard/analytics",async(req,res)=>{
            try {
                const catcheAnalytics = myCache.get("dashboardDataCatche");
                if(catcheAnalytics){
                    return res.json(catcheAnalytics)
                }else{

                }
                const [activeUser] = await Promise.all([
                    userCollection.countDocuments()
                ]);
                const analyticsData = {
                    activeUser
                };
                myCache.set("dashboardDataCatche",analyticsData, 600 )
            } catch (error) {
                
            }
        })





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(5500, () => {
    console.log(`Server run successfully at http://localhost:5500`)
})