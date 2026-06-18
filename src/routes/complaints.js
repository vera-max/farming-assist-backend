import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Legacy complaint route file.
// Current app.js uses /farmers/complaints in farmerRoutes.js.

// Farmers can submit complaints.
router.post('/', authenticate, authorize(['farmer']), async (req, res) => {
  // handle complaint submission
});

// Admins can view all complaints.
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  // return all complaints
});

export default router;
