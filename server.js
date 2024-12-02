var express = require("express");
let app = express();
const cors = require("cors");


//Middleware
app.use(cors());
app.use(express.json());
app.set('json spaces', 3);


const path = require('path');
let PropertiesReader = require("properties-reader");


// Load properties from the properties file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);


// Use values from properties file to connect to MongoDB
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');


const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });


//variable to store database connection
let db1;

//Function to connect to MongoDB
async function connectDB() {
  try {
    client.connect();
    console.log('Connected to MongoDB');
    db1 = client.db('lessons_booking');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

//Call the connectDB function 
connectDB(); 

//Setting the route collection
app.param('collectionName', async function(req, res, next, collectionName) { 
    // Using the URL to choose the collection
    req.collection = db1.collection(collectionName);
    console.log('Middleware set collection:', req.collection.collectionName);
    next();
});

// Logger middleware
app.use((req, res, next) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url}`;
    console.log(logMessage);
    // Proceed to the next handler
    next(); 
});


// Get all data from the specified collection
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

// Get request to get a document by the id
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

// Put request to update a document by the id
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

// Get request to search for an element on the record
app.get('/search/:collectionName', async function (req, res, next) {
    try {
        const searchQuery = req.query.q;
        // Define the search feilds, split into the string and numeric fields
        const stringFields = ["id", "title", "description", "location", "image"];
        const numericFields = ["price", "availableInventory", "rating"];
        //Defining search conditions
        const searchConditions = [];
        // Regex search for string fields
        const searchRegex = { $regex: searchQuery, $options: 'i' };
        stringFields.forEach(field => searchConditions.push({ [field]: searchRegex }));
        // Add numerical match
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

// Post request to send an order to the database
app.post("/collections/orders", async (req, res) => {
    console.log("Order request recieved");
    const { name, phone, cart, itemCount } = req.body;
    if (!name || !phone || !cart || !Array.isArray(cart) || cart.length === 0) {
        console.error("Invalid order data");
        return res.status(400).send({ error: "Invalid order data" });
    }
    try {
        console.log("Connecting to database");
        const ordersCollection = db1.collection("orders");
        const lessonsCollection = db1.collection("lessons");
        // Save order to the orders collection
        const order = {
            customerName: name,
            customerPhone: phone,
            lessons: cart,
            cartItems: itemCount
        };
        console.log("Inserting order:", order);
        await ordersCollection.insertOne(order);
        // Loop through each lesson in the cart and update the inventory
        for (const lessonId of cart) {
            try {
                console.log(`Processing lesson ID: ${lessonId}`);
                const lesson = await lessonsCollection.findOne({ id: lessonId });
                if (lesson) {
                    if (lesson.availableInventory > 0) {
                        // Reduce available inventory by 1
                        const result = await lessonsCollection.updateOne(
                            { id: lessonId }, 
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


// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});

// Start the server on port 4000
app.listen(4000, () => {
    console.log('Server is running on port 4000');
  });