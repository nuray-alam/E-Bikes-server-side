const express = require('express');
const app = express();
const cors = require('cors')
const port = process.env.PORT || 5000;

// Middleware
app.use(cors())
app.use(express.json());
