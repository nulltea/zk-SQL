import { FC } from 'react';
import { ActionButton } from '../tools/ActionButton';
import { useEffectOnlyOnUpdate } from '../../hooks/tools/useEffectOnlyOnUpdate';
import { useLogin } from '../../hooks/auth/useLogin';
import {AccountLabel} from "../ui/AccountLabel";
import {Button} from "@chakra-ui/react";

interface LoginModalButtonProps {
}

export const LoginButton: FC<LoginModalButtonProps> = ({ }) => {
  const { isLoggedIn, address, login } = useLogin();

  return (
    <>
      {isLoggedIn ? (
        <Button colorScheme='teal'>{address.slice(0,5)}...{address.slice(-4)}</Button>
      ) : (
        <Button onClick={login} colorScheme='teal'>Connect wallet</Button>
      )}
    </>
  );
};
