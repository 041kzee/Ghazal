/**
 * Customer Address routes.
 * All routes require authentication.
 */
import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/address.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from '../validators/address.validator.js';

const router = Router();

// All address routes require authenticated customer/user
router.use(authenticate);

router.get('/', getAddresses);
router.post('/', validate(createAddressSchema), createAddress);
router.patch(
  '/:id',
  validate(addressIdParamSchema, 'params'),
  validate(updateAddressSchema),
  updateAddress
);
router.delete('/:id', validate(addressIdParamSchema, 'params'), deleteAddress);
router.patch(
  '/:id/default',
  validate(addressIdParamSchema, 'params'),
  setDefaultAddress
);

export default router;

