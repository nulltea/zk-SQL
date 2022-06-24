import {
  Modal,
  ModalOverlay,
  ModalContent,
  Text,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { FC } from 'react';
import { ActionButton } from '../tools/ActionButton';
import { useEffectOnlyOnUpdate } from '../../hooks/tools/useEffectOnlyOnUpdate';
import { useLogin } from '../../hooks/auth/useLogin';
import {AccountLabel} from "../ui/AccountLabel";

interface LoginModalButtonProps {
  onClose?: () => void;
  onOpen?: () => void;
}

const CustomModalOverlay = () => {
  return <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />;
};

export const LoginModalButton: FC<LoginModalButtonProps> = ({
  onClose,
  onOpen,
}) => {
  const { isLoggedIn, address, login } = useLogin();

  useEffectOnlyOnUpdate(() => {
    if (isLoggedIn) {
      close();
    }
  }, [isLoggedIn]);

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
