import type { NextPage } from 'next';
import { MainLayout } from '../components/ui/MainLayout';
import { HeaderMenu } from '../components/ui/HeaderMenu';
import { HeaderMenuButtons } from '../components/ui/HeaderMenuButtons';
import {TableView} from "../components/ui/TableView";
import {getKnownTables} from "./api/config";
import {setLoggedInState} from "../store/auth";
import cookie from "cookie";



const Table = ({tableName, tableColumns, loggedAddress}) => {
  setLoggedInState({
    isLoggedIn: loggedAddress != undefined,
    address: loggedAddress,
  });

  return (
    <MainLayout>
      <HeaderMenu>
        <HeaderMenuButtons enabled={['auth']} />
      </HeaderMenu>
      <TableView tableName={tableName} columnNames={tableColumns}/>
    </MainLayout>
  );
};

Table.getInitialProps = async ({req, query}) => {
    const {name} = query;
    let knownTables = await getKnownTables();
    const cookieVal = cookie.parse(req ? req.headers.cookie || "" : document.cookie);


  return {
      tableName: name,
      tableColumns: knownTables.get(name.toString()),
      loggedAddress: cookieVal.metamaskAddress
    }
}

export default Table;

