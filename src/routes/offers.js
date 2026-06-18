// Legacy placeholder route for dealer offers.
// Not currently mounted in app.js.

// Dealers can post offers.
router.post('/', authenticate, authorize(['dealer']), async (req, res) => {
  // handle offer posting
});

// Farmers can view offers.
router.get('/', authenticate, authorize(['farmer']), async (req, res) => {
  // return offers
});
