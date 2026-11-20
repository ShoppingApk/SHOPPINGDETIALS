const router = require('express').Router();
const ctrl = require('../controllers/userController');
const addr = require('../controllers/addressController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { profileRules } = require('../validators/authValidators');
const { addressRules, updateAddressRules, idParam } = require('../validators/shopValidators');

router.use(protect);

router.put('/profile', profileRules, validate, ctrl.updateProfile);

router.get('/addresses', addr.listAddresses);
router.post('/addresses', addressRules, validate, addr.createAddress);
router.put('/addresses/:id', updateAddressRules, validate, addr.updateAddress);
router.delete('/addresses/:id', idParam, validate, addr.deleteAddress);

module.exports = router;
