import { proxy } from 'valtio';

type LoggedInState = {
  isLoggedIn: boolean
  address: string,
}

const loggedInInitialState: LoggedInState = {
  isLoggedIn: false,
  address: '',
};

export const loggedInState = proxy(loggedInInitialState);

export const setLoggedInState = (value: LoggedInState) => {
  loggedInState.isLoggedIn = value.isLoggedIn;
  loggedInState.address = value.address;
};

export const clearLoggingInState = () => {
  loggedInState.isLoggedIn = false;
};

