import { Box, BoxProps } from '@chakra-ui/react';
import { FC, useCallback } from 'react';
interface AccountLabelProps extends BoxProps {
  disabled?: boolean;
}

export const AccountLabel: FC<AccountLabelProps> = ({
                                                      children,
                                                      disabled = false,
                                                      ...props
                                                    }) => {

  return (
    <Box
      as="button"
  borderColor="dappTemplate.color2.darker"
  borderWidth={2}
  bgColor="transparent"
  py={2}
  px={6}
  rounded="xl"
  fontWeight="normal"
  cursor={disabled ? 'not-allowed' : 'pointer'}
  color="dappTemplate.white"
  userSelect="none"
  _hover={!disabled ? { bg: 'dappTemplate.color2.darker' } : {}}
  transition="background-color .3s"
  width={'auto'}
  opacity={!disabled ? 1 : 0.5}
  {...props}
>
  {children}
  </Box>
);
};
