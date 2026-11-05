const { query, run } = require('../config/db');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (id === 'all') {
      await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
      return res.json({ message: 'All notifications marked as read' });
    }

    await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification: ' + err.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (id === 'all') {
      await run('DELETE FROM notifications WHERE user_id = ?', [userId]);
      return res.json({ message: 'All notifications cleared' });
    }

    await run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification: ' + err.message });
  }
};
