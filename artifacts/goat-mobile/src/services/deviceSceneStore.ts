import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalSceneStore } from "./localSceneStore";

export const localSceneStore = new LocalSceneStore(AsyncStorage);
