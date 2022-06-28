import { proxy } from 'valtio';

type LoggedInState = {
  isLoggedIn: boolean
  addressIndex: number,
  address: string,
}

const loggedInInitialState: LoggedInState = {
  isLoggedIn: false,
  addressIndex: 0,
  address: '',
};

export const loggedInState = proxy(loggedInInitialState);

export const setLoggedInState = (value: LoggedInState) => {
  loggedInState.isLoggedIn = value.isLoggedIn;
  loggedInState.addressIndex = value.addressIndex;
  loggedInState.address = value.address;
};

export const clearLoggingInState = () => {
  loggedInState.isLoggedIn = false;
};

