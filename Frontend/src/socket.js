import { io } from "socket.io-client";
import { BASE_URL } from "./config";

export const socket = io(BASE_URL);
