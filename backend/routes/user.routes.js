import { Router } from "express";
import {
  createUser,
  deleteUser,
  generateAccessTokenAndRefreshToken,
  getUser,
  loginUser,
  updateUser,
} from "../controllers/user.controllers.js";
import { validateHeader } from "../middlewares/validateHeader.middlewares.js";

const router = Router();

router.route("/register").post(createUser);
router.route("/login").post(loginUser);
router.route("/user/issue/tokens").post(generateAccessTokenAndRefreshToken);

router.route("/user/details").get(validateHeader, getUser);
router.route("/user/update").patch(validateHeader, updateUser);
router.route("/user/delete").delete(validateHeader, deleteUser);

export default router;
