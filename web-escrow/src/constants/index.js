import * as devnet from "./devnet";
import * as mainnet from "./mainnet";

const network = import.meta.env.VITE_NETWORK;
const config = network === "mainnet" ? mainnet : devnet;

export default config;