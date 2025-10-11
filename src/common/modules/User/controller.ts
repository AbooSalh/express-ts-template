import UserModel from "./model";
import BaseController from "@/common/controllers/handlers/index";
import expressAsyncHandler from "express-async-handler";
import * as userService from "./user.service";
import * as userValidator from "./user.validator";

// Create base controller instance
const baseUserController = new BaseController({ 
  model: UserModel,
  hiddenFields: {
    public: ["password", "email", "wishlist"],
    user: ["password"],
    admin: []
  }
});

export const UserC = {
  // Standard CRUD operations
  getAll: baseUserController.getAll,
  getOne: baseUserController.getOne,
  create: baseUserController.create,
  update: baseUserController.update,
  delete: baseUserController.delete,

  sendDeleteAccountCode: {
    handler: expressAsyncHandler(userService.sendDeleteAccountCode),
    validator: userValidator.sendDeleteAccountCodeValidator,
  },
  deleteAccount: {
    handler: expressAsyncHandler(userService.deleteAccount),
    validator: userValidator.deleteAccountValidator,
  },

  changePassword: {
    handler: expressAsyncHandler(userService.changePassword),
    validator: userValidator.changePasswordValidator,
  },

  getProfile: {
    handler: expressAsyncHandler(userService.getProfile),
  },

  updateAuthUser: {
    handler: expressAsyncHandler(userService.updateAuthUser),
    validator: userValidator.updateAuthUserValidator,
  },
};

export default UserC;
