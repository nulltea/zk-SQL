import { FC } from 'react';
import { ActionButton } from '../tools/ActionButton';
import { useEffectOnlyOnUpdate } from '../../hooks/tools/useEffectOnlyOnUpdate';
import { useLogin } from '../../hooks/auth/useLogin';
import {AccountLabel} from "../ui/AccountLabel";

interface LoginModalButtonProps {
}

export const LoginButton: FC<LoginModalButtonProps> = ({ }) => {
  const { isLoggedIn, address, login } = useLogin();

  return (
    <>
      {isLoggedIn ? (
        <AccountLabel>{address.slice(0,5)}...{address.slice(-3)}</AccountLabel>
      ) : (
        <ActionButton onClick={login}>Connect</ActionButton>
      )}
    </>
  );
};
