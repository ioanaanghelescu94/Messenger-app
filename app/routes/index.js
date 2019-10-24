const express = require('express');

const USER_CONTROLLER = require('../controller/users');
const CONVERSATION_CONTROLLER = require('../controller/conversations');

const router = express.Router();

router.get('/healthcheck', (req, res) => {
	res.status(200).json({message: "Server is alive"})
})

router.post("/register", USER_CONTROLLER.register);
router.use("/user", USER_CONTROLLER.authMiddleware);
router.use("/user", USER_CONTROLLER.extractDataMiddleware);
router.post("/login", USER_CONTROLLER.login);
router.get("/user/get_my_data", USER_CONTROLLER.get_my_data);
router.post("/user/send_friend_request", USER_CONTROLLER.send_friend_request);
router.post("/user/confirm_friend_request", USER_CONTROLLER.confirm_friend_request);
router.get("/user/get_friend_requests", USER_CONTROLLER.get_friend_requests);
router.get("/user/get_friend_suggestions", USER_CONTROLLER.get_friend_suggestions);
router.post("/user/get_conversation", CONVERSATION_CONTROLLER.get_conversation);
router.post("/user/send_messages", CONVERSATION_CONTROLLER.send_messages);
router.post("/user/seen_conversation", CONVERSATION_CONTROLLER.seen_conversation);
router.post("/user/check_activity", USER_CONTROLLER.check_activity);
router.get("/user/get_conversation_list", CONVERSATION_CONTROLLER.get_conversation_list);
router.post("/user/login_with_token", USER_CONTROLLER.login_with_token);
router.post("/user/delete_message", CONVERSATION_CONTROLLER.delete_message);
router.post("/user/change_user_data", USER_CONTROLLER.change_user_data);

module.exports = router;