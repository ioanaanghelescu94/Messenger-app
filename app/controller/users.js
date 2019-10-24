const JWT = require("jsonwebtoken");

const User = require("../models/users");
const Conversation = require("../models/conversations");
const CONFIG = require("../config");

const get_my_data = (req, res) => {
  if (req.user) {
    res.status(200).json({
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      email: req.user.email,
      picture: req.user.picture,
      description: req.user.description,
      phone: req.user.phone
    });
  } else {
    req.status(500).json({ message: "Database error" });
  }
};

const register = (req, res) => {
  if (req.body && req.body.firstname && req.body.lastname && req.body.password && req.body.email) {
    var newUser = new User({
      email: req.body.email,
      password: req.body.password,
      firstname: req.body.firstname,
      lastname: req.body.lastname
    });

    newUser.save((err, result) => {
      if (err) {
        console.log(err);
        res.sendStatus(409);
      } else {
        res.status(200).json({ message: "Registered with success" });
      }
    });
  } else {
    res
      .status(422)
      .json({ message: "Please provide all data for the register process" });
  }
};

const login = (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    // verifica daca exista req.body si daca sunt ambele campuri completate
    User.findOne({
      email: req.body.email,
      password: req.body.password
    }, "-friends")
    .lean()
    .then(result => {
      if (result === null) {
        res.status(401).json({ message: "Wrong combination" });
        // 401 unauthorized
      } else {
        var TOKEN = JWT.sign(
          {
            email: req.body.email,
            id: result._id,
            exp: Math.floor(Date.now() / 1000 + CONFIG.JWT_EXPIRE_TIME)
          },
          CONFIG.JWT_SECRET_KEY
        );
        res.status(200).json({ token: TOKEN, user: result });
      }
    });
    // .catch(err => {
    // 	res.status(404).json({message:"Wrong username or password"})
    // })
  } else {
    res.status(422).json({ message: "Please provide all data" });
    //422 unprocessable entity
  }
};

const login_with_token = (req, res) => {
  if(req.user) {
    
    var user = req.user.toObject();
    delete user.friends;
    res.status(200).json({message:"token is valid", user})
  }
}

const send_friend_request = (req, res) => {
  if (!req.body.friend_id) {
    res.status(400).json({ message: "Please provide friend id!" });
  } else if (req.user._id.equals(req.body.friend_id)) {
    res.status(409).json({ message: "You cannot add yourself" });
  } else {
    User.findById(req.body.friend_id)
      .then(data => {
        if (
          data.friends.find(friend => friend._id.equals(req.user._id)) === undefined
        ) {
          // .equals() - e ObjectId id-ul(tip obiect) si nu poti scrie obiect ==== obiect
          User.updateOne(
            { _id: data._id },
            {
              $push: {
                friends: {
                  _id: req.user._id,
                  firstname: req.user.firstname,
                  lastname: req.user.lastname,
                  email: req.user.email,
                  status: 1
                }
              },
              
              $set: {
                last_activity: Date.now()
              }
              //$set rescrie tot obiectul, $push doar adauga
            }
          )
            .then(result => {
              User.updateOne(
                { _id: req.user._id },
                {
                  $push: {
                    friends: {
                      _id: data._id,
                      firstname: data.firstname,
                      lastname: data.lastname,
                      email: data.email,
                      status: 2
                    }
                  }
                }
              )
                .then(blabla => {
                  res.status(200).json({ message: "Friend request sent!" });
                })
                .catch(errss => {
                  res.status(500).json({ message: "Error when adding friend" });
                });
            })
            .catch(err => {
              res
                .status(500)
                .json({ message: "Database error at adding friend request." });
            });
        } else {
          res.status(409).json({
            message:
              "I-ai mai trimis odata friend request sau sunteti deja prieteni sau ti-a trimis el tie"
          });
        }
      })
      .catch(err => {
        res.status(500).json({ message: "Wrong friend id!" });
      });
  }
};

const confirm_friend_request = (req, res) => {
  if (!req.body.friend_id || req.body.answer === undefined) {
    res.status(400).json({ message: "Please provide friend id and answer!" });
  } else {
    User.findById(req.body.friend_id)
      .then(data => {
        if (data === null) {
          res.status(404).json({ message: "Friend not found, data null" });
          // res status = return?
        }
        
        var me = data.friends.find(friend => friend._id.equals(req.user._id));

        if (me && me.status === 2) {
          if (req.body.answer === true) {
            User.updateOne(
              { _id: data._id, "friends._id": req.user._id },
              {
                $set: {
                  "friends.$.status": 0,
                  last_activity: Date.now()
                }
              }
            )
              .then(result => {
                User.updateOne(
                  { _id: req.user._id, "friends._id": data._id },
                  {
                    $set: {
                      "friends.$.status": 0
                    }
                  }
                )
                  .then(() => {
                    var newConversation = new Conversation({
                      participants: [req.user._id, data._id],
                      messages: [],
                      last_message: {
                        author_id: null,
                        author: null,
                        message: "You and " + data.username + " are now friends",
                        timestamp: Date.now()
                      },
                      last_updated: Date.now()
                    });

                    newConversation.save((err, conv) => {
                      if (err) {
                        return res.status(409);
                      }
                    });

                    res.status(200).json({ message: "Friend request accepted" });
                  })
                  .catch(() => {
                    register.status(500).json({
                      message: "Db error at confirming friend request"
                    });
                  });
              })
              .catch(() => {
                res.status(500).json({ message: "Db error at confirming friend request" });     
              });
          } else {
            User.updateOne(
              { _id: data._id },
              {
                $set: {
                  friends: data.friends.filter(
                    friend => !friend._id.equals(req.user._id)
                  )
                }
              }
            )
              .then(result => {
                User.updateOne(
                  { _id: req.user._id },
                  {
                    $set: {
                      friends: req.user.friends.filter(
                        friend => !friend._id.equals(data._id)
                      )
                    }
                  }
                )
                  .then(() => {
                    res.status(200).json({ message: "Friend request denied" });
                  })
                  .catch(() => {
                    register
                      .status(500)
                      .json({ message: "Db error at denying friend request" });
                  });
              })
              .catch(() => {
                res
                  .status(500)
                  .json({ message: "Db error at denying friend request" });
              });
          }
        } else {
          res.status(409).json({ message: "Friend already confirmed" });
        }
      })
      .catch(err => {
        console.log(err);
        res.status(404).json({ message: "Friend not found blabla" });
      });
  }
};

const get_friend_suggestions = (req, res) => {
  var filter = !req.query.search_word
    ? {
        _id: {
          $nin: [...req.user.friends.map(friend => friend._id), req.user._id]
        }
      }
    : {
        _id: {
          $nin: [...req.user.friends.map(friend => friend._id), req.user._id]
        },
        firstname: { $regex: "^" + req.query.search_word, $options: "i" }
      };
  // ^ -  e fol ca sa imi caute si numele incomplet
  //nin - not included
  User.find(filter, (err, friend_suggestions) => {
    if (err) {
      res.status(500).json({ message: "Database error" });
    } else {
      res.status(200).json({
        message: "These are your friend suggestions",
        friend_suggestions
      })
    }
  })
};

const get_friend_requests = (req, res) => {
  var friends_requests = req.user.friends.filter( friend => friend.status === 1);
	if(friends_requests.length === 0) {
		res.status(200).json({message: "You have no friends requests!"})
	} else {
		res.status(200).json({message: "Successfully retrieved friends requests!", data: friends_requests})
	}
};

const extractDataMiddleware = (req, res, next) => {
  if (req.token_payload.email) {
    User.findOne({ email: req.token_payload.email })
      .populate({ path: "friends._id", select: ["-password", "-friends"] })
      .then(result => {
        if (result !== null) {
          req.user = result;
          next();
        } else {
          res.status(404).json({ message: "Missing user" });
        }
      });
  } else {
    res.status(404).json({ message: "Missing user field" });
  }
  // payload este obiectul returnat de token :
  // "email": "ioana.anghelescu",
  //   "exp": 1559649226,
  //   "iat": 1559562826
};

const authMiddleware = (req, res, next) => {
  if (req.headers["token"]) {
    JWT.verify(req.headers["token"], CONFIG.JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        res.status(403).json({ message: "Invalid token" });
      } else {
        req.token_payload = payload;
        next();
      }
    });
  } else {
    res.status(403).json({ message: "Missing login token" });
  }
};

const check_activity = (req, res) => {
  if(req.body.last_activity) {
    var boolean = (Date.parse(req.user.last_activity) - Date.parse(req.body.last_activity)) > 0
    res.status(200).json(boolean)
  } else {
    res.status(400).json({message:"Please provide time"})
  }
}

const change_user_data = (req, res) => {
 if(req.body) {
   User.updateOne({
     _id: req.user._id
   },
   {
     $set: {
      firstname: req.body.firstname ? req.body.firstname : req.user.firstname,
      lastname: req.body.lastname ? req.body.lastname : req.user.lastname,
      email: req.body.email ? req.body.email : req.user.email,
      photo: req.body.photo ? req.body.photo : req.user.photo,
      sex: req.body.sex ? req.body.sex : req.user.sex,
      description: req.body.description ? req.body.description :req.user.description
     }
   })
   .then(data => {
     res.status(200).json({message: "Successfully updated user"})
   })
   .catch(err => {
     console.log(err)
   })
 }
}


module.exports = {
  register,
  login,
  get_my_data,
  authMiddleware,
  extractDataMiddleware,
  confirm_friend_request,
  send_friend_request,
  get_friend_requests,
  get_friend_suggestions,
  check_activity,
  login_with_token,
  change_user_data
};
//se exp fnctiile
