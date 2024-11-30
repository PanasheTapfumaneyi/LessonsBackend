var express = require("express");
let app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());
app.set('json spaces', 3);
const path = require('path');
let PropertiesReader = require("properties-reader");
// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1;//declare variable

async function connectDB() {
  try {
    client.connect();
    console.log('Connected to MongoDB');
    db1 = client.db('lessons_booking');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

connectDB(); //call the connectDB function to connect to MongoDB database

//Optional if you want the get the collection name from the Fetch API in test3.html then
app.param('collectionName', async function(req, res, next, collectionName) { 
    req.collection = db1.collection(collectionName);
    /*Check the collection name for debugging if error */
    console.log('Middleware set collection:', req.collection.collectionName);
    next();
});

// Ensure this route is defined after the middleware app.param
// get all data from our collection in Mongodb
app.get('/collections/:collectionName', async function(req, res, next) {
    try{
        const results = await req.collection.find({}).toArray();

        console.log(results)

        res.json(results)
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
    
});

app.get('/collections1/:collectionName', async function(req, res, next) {
    try{
        const results = await req.collection.find({}, {limit:3, sort: {price:-1}}).toArray();

        console.log(results)

        res.json(results)
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

app.get('/collections/:collectionName/:max/:sortAspect/:sortAscDesc', async function(req, res, next){
    try{

            // TODO: Validate params
    var max = parseInt(req.params.max, 10); // base 10
    let sortDirection = 1;
    if (req.params.sortAscDesc === "desc") {
    sortDirection = -1;
    }
        const results = await req.collection.find({}, {limit:3, sort: {[req.params.sortAspect]: sortDirection}}).toArray();

        console.log(results)

        res.json(results)
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

app.get('/collections/:collectionName/:id' , async function(req, res, next) {
    try{
        const results = await req.collection.findOne({_id:new ObjectId(req.params.id)});

        console.log(results)

        res.json(results)
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

app.post('/collections/:collectionName', async function(req, res, next) {
    try{

        console.log(req.body);

        const results = await req.collection.insertOne(req.body);


        console.log(results)

        res.json(results)
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

app.delete('/collections/:collectionName/:id', async function(req, res, next) {
    try{
        console.log(req.params.id);

        const results = await req.collection.deleteOne({_id: new ObjectId(req.params.id)});

        console.log(results)

        res.json((results.deletedCount === 1) ? {msg: "success"} : {msg: "Error"})
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

app.put('/collections/:collectionName/:id', async function(req, res, next) {
    try{
        console.log(req.params.id);

        const results = await req.collection.updateOne({_id: new ObjectId(req.params.id)},
        {$set:req.body}
    );

        console.log(results)

        res.json((results.matchedCount === 1) ? {msg: "success"} : {msg: "Error"})
    }catch(err){
        console.error("Error fetching: ", err.messafe)
        next(err)
    }
});

// Save an order and update inventory
app.post("collections/orders", async (req, res) => {
    const { name, phone, cart } = req.body;

    if (!name || !phone || !cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).send({ error: "Invalid order data" });
    }

    try {
        // Save the order to the "orders" collection
        const order = {
            customerName: name,
            customerPhone: phone,
            lessons: cart,
            orderDate: new Date()
        };
        const ordersCollection = db.collection("orders");
        const lessonsCollection = db.collection("lessons");

        // Insert the order
        await ordersCollection.insertOne(order);

    // Update the availability of lessons
    for (const lessonId of cart) {
        const lessonObjectId = new ObjectId(lessonId);

        const updateResult = await lessonsCollection.updateOne(
            { _id: lessonObjectId, availableInventory: { $gt: 0 } },
            { $inc: { availableInventory: -1 } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(400).send({ error: `Lesson ${lessonId} is out of stock` });
        }
    }


        res.status(200).send({ message: "Order placed successfully" });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send({ error: "Failed to place order" });
    }
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});

// Start the server
app.listen(4000, () => {
    console.log('Server is running on port 4000');
  });