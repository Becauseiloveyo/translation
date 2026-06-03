import { Dispatch, SetStateAction } from "react";
import { AppStore } from "./models";

export type PageProps = {
  store: AppStore;
  setStore: Dispatch<SetStateAction<AppStore>>;
};

