import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Wallet: undefined;
  Plan: undefined;
  AI: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  History: undefined;
  AddTransaction: undefined;
};
