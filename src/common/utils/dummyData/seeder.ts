import dbConnection from "@/common/config/database.config";
import dotenv from "dotenv";
import fs from "fs";
import "colors";
import ProductM from "@/modules/Product/model";
dotenv.config({ path: "../../config.env" });

// connect to DB
dbConnection.connect();

// Read data
const products = JSON.parse(fs.readFileSync("./src/common/utils/dummyData/products.json", "utf-8"));
// Insert data into DB
const insertData = async () => {
  try {
    await ProductM.create(products);

    console.log("Data Inserted".green.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// Delete data from DB
const destroyData = async () => {
  try {
    await ProductM.deleteMany();
    console.log("Data Destroyed".red.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// node seeder.js -d
if (process.argv[2] === "-i") {
  insertData();
} else if (process.argv[2] === "-d") {
  destroyData();
}
