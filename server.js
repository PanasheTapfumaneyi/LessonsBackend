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

// Logger middleware
app.use((req, res, next) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url}`;
    console.log(logMessage);
    next(); // Proceed to the next middleware or route handler
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

// app.post('/collections/:collectionName', async function(req, res, next) {
//     try{

//         console.log(req.body);

//         const results = await req.collection.insertOne(req.body);


//         console.log(results)

//         res.json(results)
//     }catch(err){
//         console.error("Error fetching: ", err.messafe)
//         next(err)
//     }
// });

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
    try {
        console.log(req.params.id);

        // Update the document with the new data
        const updateResult = await req.collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );

        console.log(updateResult);

        // If the update was successful, respond with success message
        res.json((updateResult.matchedCount === 1) ? { msg: "success" } : { msg: "Error" });
    } catch (err) {
        console.error("Error updating:", err.message);
        next(err);
    }
});


app.get('/search/:collectionName', async function (req, res, next) {
    try {
        const searchQuery = req.query.q;

        // Define the fields to search
        const stringFields = ["id", "title", "description", "location", "image"];
        const numericFields = ["price", "availableInventory", "rating"];

        // Build the $or conditions
        const searchConditions = [];

        // Add regex search for string fields
        const searchRegex = { $regex: searchQuery, $options: 'i' };
        stringFields.forEach(field => searchConditions.push({ [field]: searchRegex }));

        // Add numerical match (e.g., exact match or range)
        if (!isNaN(searchQuery)) {
            const queryNumber = parseFloat(searchQuery);
            numericFields.forEach(field => searchConditions.push({ [field]: queryNumber }));
        }

        const results = await req.collection.find({ $or: searchConditions }).toArray();
        res.json(results);
    } catch (err) {
        console.error("Error fetching search results: ", err.message);
        next(err);
    }
});

// // Save an order and update inventory
// app.post("collections/orders", async (req, res) => {
//     const { name, phone, cart } = req.body;

//     if (!name || !phone || !cart || !Array.isArray(cart) || cart.length === 0) {
//         return res.status(400).send({ error: "Invalid order data" });
//     }

//     try {
//         // Save the order to the "orders" collection
//         const order = {
//             customerName: name,
//             customerPhone: phone,
//             lessons: cart,
//             orderDate: new Date()
//         };
//         const ordersCollection = db.collection("orders");
//         const lessonsCollection = db.collection("lessons");


//                 // Check connection to lessonsCollection
//                 const testLesson = await lessonsCollection.findOne({id: 2});
//                 if (testLesson) {
//                     console.log("Connection to lessonsCollection is working:", testLesson);
//                 } else {
//                     console.error("Failed to fetch a document from lessonsCollection.");
//                 }
//         // Insert the order
//         await ordersCollection.insertOne(order);

//                 // Loop through each lesson in the cart and update the inventory
// // Loop through each lesson in the cart and update the inventory
//     for (const lessonId of cart) {
//         try {
//             console.log(`Processing lesson ID: ${lessonId}`);
//             const lesson = await lessonsCollection.findOne({ id: lessonId }); // Use 'id' instead of '_id'
//             if (lesson) {
//                 if (lesson.availableInventory > 0) {
//                     // Reduce available inventory by 1
//                     const result = await lessonsCollection.updateOne(
//                         { id: lessonId }, // Use 'id' field to search
//                         { $inc: { availableInventory: -1 } }
//                     );

//                     console.log(`Update result for lesson ID ${lessonId}:`, result);

//                     if (result.modifiedCount === 0) {
//                         console.error(`Failed to update inventory for lesson ID: ${lessonId}`);
//                     }
//                 } else {
//                     console.error(`Lesson with ID ${lessonId} is out of stock.`);
//                 }
//             } else {
//                 console.error(`Lesson with ID ${lessonId} not found.`);
//             }
//         } catch (error) {
//             console.error(`Error updating inventory for lesson ID ${lessonId}:`, error.message);
//         }
//     }

    


//         res.status(200).send({ message: "Order placed successfully" });
//     } catch (error) {
//         console.error("Error placing order:", error);
//         res.status(500).send({ error: "Failed to place order" });
//     }
// });

app.post("/collections/orders", async (req, res) => {
    console.log("Received request to place an order");

    const { name, phone, cart } = req.body;

    if (!name || !phone || !cart || !Array.isArray(cart) || cart.length === 0) {
        console.error("Invalid order data");
        return res.status(400).send({ error: "Invalid order data" });
    }

    try {
        console.log("Connecting to database...");
        const ordersCollection = db1.collection("orders");
        const lessonsCollection = db1.collection("lessons");

        // Check connection to lessonsCollection
        const testLesson = await lessonsCollection.findOne({ id: 3 });
        if (testLesson) {
            console.log("Connection to lessonsCollection is working:", testLesson);
        } else {
            console.error("Failed to fetch a document from lessonsCollection.");
        }

        // Save the order to the "orders" collection
        const order = {
            customerName: name,
            customerPhone: phone,
            lessons: cart,
        };

        console.log("Inserting order:", order);
        await ordersCollection.insertOne(order);

        // Loop through each lesson in the cart and update the inventory
        for (const lessonId of cart) {
            try {
                console.log(`Processing lesson ID: ${lessonId}`);
                const lesson = await lessonsCollection.findOne({ id: lessonId }); // Use 'id' instead of '_id'
                if (lesson) {
                    if (lesson.availableInventory > 0) {
                        // Reduce available inventory by 1
                        const result = await lessonsCollection.updateOne(
                            { id: lessonId }, // Use 'id' field to search
                            { $inc: { availableInventory: -1 } }
                        );

                        console.log(`Update result for lesson ID ${lessonId}:`, result);

                        if (result.modifiedCount === 0) {
                            console.error(`Failed to update inventory for lesson ID: ${lessonId}`);
                        } else {
                            console.log(`Successfully updated inventory for lesson ID: ${lessonId}`);
                        }
                    } else {
                        console.error(`Lesson with ID ${lessonId} is out of stock.`);
                    }
                } else {
                    console.error(`Lesson with ID ${lessonId} not found.`);
                }
            } catch (error) {
                console.error(`Error updating inventory for lesson ID ${lessonId}:`, error.message);
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