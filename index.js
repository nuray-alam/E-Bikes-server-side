const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const port = process.env.PORT || 5000;

// Middleware
app.use(cors())
app.use(express.json());


// const serviceAccount = require("./e-bikes-firebase-adminsdk.json");
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
let serviceAccount;
try {

    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

} catch (err) {
    // 👇️ This runs
    console.log('Error: ', err.message);
}



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//connecting to the database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1yqsx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//verifying token
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {

        const token = req.headers.authorization.split(' ')[1];


        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {


        }
    }
    next();
}



async function run() {

    try {
        await client.connect();
        const database = client.db('e_bikes');
        const bikeCollection = database.collection('bikes');
        const usersCollection = database.collection('users');
        const orderCollection = database.collection('orders');
        const reviewCollection = database.collection('reviews')
        const blogCollection = database.collection('blogs');
        console.log("database connected");

        // GET API for all bikes

        app.get('/bikes', async (req, res) => {

            const cursor = bikeCollection.find({});
            const bikes = await cursor.toArray();
            res.json(bikes)
        })

        //GET API for a single bike Info
        app.get('/bike/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bike = await bikeCollection.findOne(query);
            res.json(bike);
        })
        //GET API for all orders
        app.get('/orders', verifyToken, async (req, res) => {
            const requester = req.decodedEmail;
            if (requester) {
                const cursor = orderCollection.find({});
                const orders = await cursor.toArray();
                res.json(orders)
            }
            else {
                res.status(403).json({ message: 'you do not to have access for orders' })
            }
        })


        //GET API for all blogs
        app.get('/blogs', async (req, res) => {

            const cursor = blogCollection.find({});
            const blogs = await cursor.toArray();
            res.json(blogs)
        })



        //GET API for my orders

        app.get('/myOrders/:email', async (req, res) => {



            const email = req.params.email;
            const query = { email: email };
            const cursor = orderCollection.find(query);
            const myOrders = await cursor.toArray();
            res.json(myOrders)


        })

        //DELETE Order API
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })

        //POST API for add new order
        app.post('/proceedOrder', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        })

        //UPDATE Order Status API
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'shipped'
                },
            };
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        //POST API for adding new bike

        app.post('/bikes', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const newBike = req.body;
                    const result = await bikeCollection.insertOne(newBike);
                    res.json(result)
                }

            }
            else {
                res.status(403).json({ message: 'you do not have access to add a bike' })
            }

        })

        app.get('/review', async (req, res) => {

            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews)
        })
        //  POST API  for review
        app.post('/review', async (req, res) => {

            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.json(result)

        })



        // DELETE API for delete a bike
        app.delete('/bike/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bikeCollection.deleteOne(query);
            res.json(result);
        })

        //POST API for Creating user with email and password
        app.post('/users', async (req, res) => {

            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        //PUT API for Google sign in
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            // create a document that sets the plot of the movie
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        //checking if admin
        app.get('/users/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });

        })


        // Making an admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }

            }
            else {
                res.status(403).json({ message: 'you don to have access to make admin' })
            }

        })


    }

    finally {

        // await client.close();
    }

}


run().catch(console.dir)
app.get('/', (req, res) => {
    res.send('welcome to e-bikes server')
})

app.listen(port, () => {
    console.log(`listening from port:${port}`)
})