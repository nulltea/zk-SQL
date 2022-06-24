import { Box } from '@chakra-ui/react';
import { FC } from 'react';
import { SocialMediaIcons } from './SocialMediaIcons';
import { LoginModalButton } from '../tools/LoginModalButton';

interface HeaderMenuButtonsProps {
  enabled: string[];
}

export const HeaderMenuButtons: FC<HeaderMenuButtonsProps> = ({ enabled }) => {
  return (
    <Box
      display="flex"
      gap={5}
      alignItems="center"
      sx={{
        '@media screen and (max-width: 515px)': {
          flexDirection: 'column',
        },
      }}
    >
      <SocialMediaIcons />
      {enabled.includes('auth') && <LoginModalButton />}
    </Box>
  );
};
