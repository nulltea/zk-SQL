import type { NextPage } from 'next';
import { MainLayout } from '../components/ui/MainLayout';
import { HeaderMenu } from '../components/ui/HeaderMenu';
import { HeaderMenuButtons } from '../components/ui/HeaderMenuButtons';
import {TablesSelector} from "../components/ui/TablesSelector";
import {setLoggedInState} from "../store/auth";
import cookie from "cookie";

declare global {
  interface Window{
    ethereum: any
  }
}

const Home = ({loggedAddress}) => {
  setLoggedInState({
    isLoggedIn: loggedAddress != undefined,
    address: loggedAddress,
  });

  return (
    <MainLayout>
      <HeaderMenu>
        <HeaderMenuButtons enabled={['auth']} />
      </HeaderMenu>
        <TablesSelector/>
    </MainLayout>
  );
};

Home.getInitialProps = ({req}) => {
  const cookieVal = cookie.parse(req ? req.headers.cookie || "" : document.cookie);

  return {
    loggedAddress: cookieVal.metamaskAddress
  }
}

export default Home;
