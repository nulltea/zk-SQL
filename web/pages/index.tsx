import type { NextPage } from 'next';
import {
  ListItem,
  Text,
  OrderedList,
  UnorderedList,
  Flex,
  Link,
} from '@chakra-ui/react';
import { MainLayout } from '../components/ui/MainLayout';
import { HeaderMenu } from '../components/ui/HeaderMenu';
import { HeaderMenuButtons } from '../components/ui/HeaderMenuButtons';
import { Authenticated } from '../components/tools/Authenticated';
import { CardWrapper } from '../components/ui/CardWrapper';
import { LoginModalButton } from '../components/tools/LoginModalButton';
import {TableView} from "../components/ui/TableView";

declare global {
  interface Window{
    ethereum: any
  }
}

const Home: NextPage = () => {
  return (
    <MainLayout>
      <HeaderMenu>
        <HeaderMenuButtons enabled={['auth']} />
      </HeaderMenu>
      <CardWrapper mb={4}>
        <TableView/>
      </CardWrapper>
    </MainLayout>
  );
};

export default Home;
