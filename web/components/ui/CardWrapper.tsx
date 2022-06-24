import { Flex, Box, chakra, FlexProps, BoxProps } from '@chakra-ui/react';
import { FC } from 'react';

export const FlexCardWrapper: FC<FlexProps> = ({ children, ...props }) => {
  const Wrapper = chakra(Flex, {
    baseStyle: {
      backgroundColor: 'dappTemplate.dark.darker',
      padding: 8,
      borderRadius: '2xl',
      textAlign: 'center',
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...props,
    },
  });
  return <Wrapper>{children}</Wrapper>;
};

export const CardWrapper: FC<BoxProps> = ({ children, ...props }) => {
  const Wrapper = chakra(Box, {
    baseStyle: {
      backgroundColor: 'dappTemplate.dark.darker',
      padding: 8,
      borderRadius: '2xl',
      ...props,
    },
  });
  return <Wrapper>{children}</Wrapper>;
};
