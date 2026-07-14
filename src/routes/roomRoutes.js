const express = require('express');
const router = express.Router();
const {
  getMyRooms,
  createRoom,
  joinRoom,
  getRoomMembers,
} = require('../controllers/roomController');
const { getRoomMessages } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware); // كل الـ routes هنا لازم تسجيل دخول

router.get('/', getMyRooms);
router.post('/', createRoom);
router.post('/:roomId/join', joinRoom);
router.get('/:roomId/members', getRoomMembers);
router.get('/:roomId/messages', getRoomMessages);

module.exports = router;
