const Conversation = require("../models/conversations");
const User = require("../models/users");

const get_conversation = (req, res) => {
  if(req.body.conversation_id) {
    Conversation.findById(req.body.conversation_id).populate("participants", "-friends")
    .then(conv => {
      // if (!conv.paricipants.includes(req.uer._id)) {} - var mai clean
      if(!conv) {
        res.status(404).json({message:"Conversation not found"})
      } 
      
      if (conv.participants.find(participant => participant._id.equals(req.user._id)) === undefined) {
        res.status(409).json({ message: "You cannot see other people's conversations" });
      } else {
        res.status(200).json(conv);
      }
    })
    .catch(err => {
      res.status(500).json({message:"Db error "+ err})
    })
  } else {
    res.status(400).json({message:"Please provide conversation id"});
  }
};

const send_messages = (req, res) => {
  if (req.body.conversation_id && req.body.message) {

    Conversation.findById(req.body.conversation_id)
      .then(conv => {
        if (
          conv.participants.find(participant =>
            participant.equals(req.user._id)
          ) === undefined
        ) {
          res.status(409).json({ message: "Forbidden" });
        } else {
          conv.messages.push({
            author: req.user.firstname,
            message: req.body.message,
            timestamp: Date.now()
          });
      
          conv.last_updated = Date.now();
          var me = conv.seen.filter(me => me.participant_id.equals(req.user._id))[0];
          me.seen = Date.now();

          conv.save((err, result) => {
            if (err) {
              console.log(err);
              res.status(500).json({ message: "Database error" });
            } else {
              User.updateOne(
                {
                  _id: conv.participants.filter(
                    participant => participant != req.user._id
                  )[0]
                },
                {
                  $set: {
                    last_activity: Date.now()
                  }
                },
                {
                  upsert: true
                }
              ).then(data => {
                //console.log(data);
                res.status(200).json({ message: "Message successfully sent" });
              })
              // User.findById(conv.participants.find(participant => participant.equals(!req.user._id)) === true)
              // .then(me => {
              // })
            }
          });
        }
      })
      .catch(err => {
        res.status(500).json({ message: "Database error" });
      });
  } else {
    if (!req.body.message) {
      res.status(400).json({ message: "Please insert message" });
    } else {
      res.status(400).json({ message: "Please insert user id" });
    }
  }
};

const delete_message = (req, res) => {
  if(req.body.message_id && req.body.conversation_id) {
    Conversation.findByIdAndUpdate(req.body.conversation_id,
      {
        $pull: {
          messages: {_id: req.body.message_id}
        }
      },
      (err, conv) => {
        if(err) {
          res.status(500).json({message:"Error at DB"})
        } else {
          res.status(200).json({message:"Successfully deleted", conv})
        }
      }
      )
  }
  else {
    res.status(400).json({message:"Please send all things required"})
  }
}

const seen_conversation = (req, res) => {
  if (req.body.conversation_id) {
    Conversation.findById(req.body.conversation_id)
      .then(conv => {
        if (!conv.participants.includes(req.user._id)) {
          res.status(409).json({ message: "Forbidden" });        
        } else {
          var me = conv.seen.find(participant => participant.participant_id.equals(req.user._id));  
          if(me) {
            var friend_messages = conv.messages.filter(message => message.author !== req.user.firstname);
            var last_friend_message = friend_messages[friend_messages.length -1];
            
            if(last_friend_message && new Date(me.seen).getTime() < new Date(last_friend_message.timestamp).getTime()) {
              User.updateOne({firstname: last_friend_message.author}, { $set: { last_activity: Date.now()}},{upsert: true})
              .then(friend => {
                console.log(friend)
              })
              .catch(err=> {
                console.log(err)
              })
            }

            me.seen = Date.now();
          } else {
            conv.seen.push({
              participant_id: req.user._id,
              seen: Date.now()
            })
          }
            conv.save();
            res.status(200).json({ message: "Message seen by you" });
        }
      })
      .catch(err => {
        if (err) {
          console.log(err)
          res.status(500).json({ message: "Cannot find conversation" });
        }
      });
  } else {
    res.status(400).json({message:"Please send all things required"})
  }
};

const get_conversation_list = (req, res) => {
  Conversation.find({participants: req.user._id})
  .sort([['last_updated', -1]]) // sort primeste 2 parametri doar daca ii pui intre [[ ]]
  .populate('participants', '_id photo firstname email')
  .lean() // fara asta nu pot prelucra raspunsul din then
  .then(bla => {
    bla.map(conv => {
      conv.friend = conv.participants.find(part => !part._id.equals(req.user._id))
      conv.last_message= conv.messages[conv.messages.length-1];
      delete conv.messages;
      delete conv.participants;
      return conv;
    })

    res.status(200).json({message: "Successfully retrieved conversations list", conversations: bla})
    
  })
  .catch(err => {
    res.status(500).json({ message: "Error at retrieving conversations list " + err });
  })
}

module.exports = {
  get_conversation,
  send_messages,
  seen_conversation,
  get_conversation_list,
  delete_message
};
