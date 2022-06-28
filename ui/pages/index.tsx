import type { NextPage } from 'next';
import { MainLayout } from '../components/ui/MainLayout';
import { HeaderMenu } from '../components/ui/HeaderMenu';
import { HeaderMenuButtons } from '../components/ui/HeaderMenuButtons';
import {TablesSelector} from "../components/ui/TablesSelector";

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
        <TablesSelector/>
    </MainLayout>
  );
};

export default Home;
