const express = require('express')
const cors = require('cors');
const parser = require('body-parser');

const CONFIG = require('./config');
const routes = require('./routes/index');

const app = express();

app.use(cors());

app.use(parser.json());

app.use(routes);

app.listen(CONFIG.PORT, () => console.log("Server stared on " + CONFIG.PORT))