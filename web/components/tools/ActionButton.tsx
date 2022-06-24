import { Box, BoxProps } from '@chakra-ui/react';
import { FC, useCallback } from 'react';

interface ActionButtonProps extends BoxProps {
  onClick: () => void;
  isFullWidth?: boolean;
  disabled?: boolean;
}

export const ActionButton: FC<ActionButtonProps> = ({
  children,
  onClick,
  isFullWidth = false,
  disabled = false,
  ...props
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick?.();
    }
  }, [disabled, onClick]);

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
      width={isFullWidth ? '100%' : 'auto'}
      onClick={handleClick}
      opacity={!disabled ? 1 : 0.5}
      {...props}
    >
      {children}
    </Box>
  );
};
