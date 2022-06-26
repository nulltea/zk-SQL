import { useSnapshot } from 'valtio';
import { loggedInState } from '../../store/auth';

export const useAccount = () => {
  const account = useSnapshot(loggedInState);

  return account;
};
