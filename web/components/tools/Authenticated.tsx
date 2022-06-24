import { FC, ReactElement } from 'react';
import { Spinner, Flex } from '@chakra-ui/react';
import { useLoggedIn } from '../../hooks/auth/useLoggedIn';

interface AuthenticatedProps {
  fallback?: ReactElement;
  noSpinner?: boolean;
  spinnerCentered?: boolean;
}

export const Authenticated: FC<AuthenticatedProps> = ({
  children,
  fallback = null,
  noSpinner = false,
  spinnerCentered = false,
}) => {
  const { isLoggingIn, isLoggedIn } = useLoggedIn();

  if (isLoggingIn)
    return noSpinner ? null : (
      <Flex justify={spinnerCentered ? 'center' : 'flex-start'}>
        <Spinner
          thickness="3px"
          speed="0.4s"
          color="elvenTools.color2.base"
          size="md"
          mt={3}
        />
      </Flex>
    );

  if (!isLoggedIn) return fallback;

  return <>{children}</>;
};
