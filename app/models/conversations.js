const mongoose = require("mongoose");
const CONFIG = require("../config");

var Schema = mongoose.Schema;

var ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "users" }],
    messages: [
      {
        author_id:{type: Schema.Types.ObjectId, ref:"users" },
        author: { type: String, ref: "User" },
        message: String,
        timestamp: Date
      }
    ],
    last_updated: Date,
    seen: [
      {
        _id: false,
        participant_id: { type: Schema.Types.ObjectId, ref: "users" },
        seen: Date
        // I am sending a seen event
      }
    ]
  },
  {
    versionKey: false
  }
);

var Conversation = mongoose.model("conversations", ConversationSchema);
//Se exporta modelul de control
module.exports = Conversation;
