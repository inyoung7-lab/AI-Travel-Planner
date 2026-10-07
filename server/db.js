import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

export async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    configDir: process.env.DB_WALLET_LOCATION,
    walletLocation: process.env.DB_WALLET_LOCATION,
    walletPassword: process.env.DB_WALLET_PASSWORD,
  });
}