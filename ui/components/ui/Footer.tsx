import { Container, Box, Text } from '@chakra-ui/react';
import packageJson from '../../package.json';

export const Footer = () => {
  return (
    <Box
      height="120px"
      bgColor="dappTemplate.dark.darker"
      color="dappTemplate.white"
      display="flex"
      alignItems="center"
    >
      <Container
        maxW="container.xl"
        fontSize="sm"
        fontWeight="normal"
        textAlign="center"
      >
      </Container>
    </Box>
  );
};
