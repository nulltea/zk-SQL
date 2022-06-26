import type { NextPage } from 'next';
import { MainLayout } from '../components/ui/MainLayout';
import { HeaderMenu } from '../components/ui/HeaderMenu';
import { HeaderMenuButtons } from '../components/ui/HeaderMenuButtons';
import { CardWrapper } from '../components/ui/CardWrapper';
import {TableView} from "../components/ui/TableView";
import {TablesSelector} from "../components/ui/TablesSelector";
import {useRouter} from "next/router";

declare global {
  interface Window{
    ethereum: any
  }
}

const Table: NextPage = () => {
  const router = useRouter()
  const { name } = router.query;

  return (
    <MainLayout>
      <HeaderMenu>
        <HeaderMenuButtons enabled={['auth']} />
      </HeaderMenu>
      <TableView tableName={(name ?? "table1").toString()}/>
    </MainLayout>
  );
};

export default Table;

