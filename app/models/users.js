const mongoose = require("mongoose");
const CONFIG = require("../config");
const arrayUniquePlugin = require("mongoose-unique-array");
//Se face conexiunea la baza de date cu mongoose
mongoose
  .connect(CONFIG.DB_ADDRESS, { useNewUrlParser: true })
  .then(data => {
    console.log("Connected to DB");
  })
  .catch(err => {
    console.log(err);
  });
//Se extrage contructorul de schema
var Schema = mongoose.Schema;

// var friendSchema = new mongoose.Schema({
// 	email: { type: String, unique: true },
// 	status: { type: Number }
// });

// var userSchema = new mongoose.Schema({
// 	friends: [friendSchema]
// })

//Se creeaza schema utilizatorului cu toate constrangerile necesare
var UserSchema = new Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    password: { type: String, required: true, select: false },
    email: { type: String, required: true, unique: true },
    sex: { type: String, enum: ["Female", "Male", "other", null] },
    photo: { type: String },
    description: { type: String },
    friends: [
      {
        friend: { type: Schema.Types.ObjectId, unique: true, ref: "users" },
        name: String,
        email: String,
        status: { type: Number, enum: [0, 1, 2] }
      }
    ],
    last_activity: {type:Date, default: Date.now(), required: true}
  },
  {
    versionKey: false
  }
);

//Se exporta modelul de control

//Se adauga schema sub forma de "Colectie" in baza de date
var User = mongoose.model("users", UserSchema);
//Se exporta modelul de control
module.exports = User;
