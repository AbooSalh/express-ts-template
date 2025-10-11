import model from "./model";
import BaseController from "@/common/controllers/handlers";

export const LanguageC = new BaseController({
  model,
  validation: {
    enabled: true,
  },
});

export default LanguageC;
