import React, {FC, useEffect, useState} from "react";
import {useForm} from 'react-hook-form';
import {
  FormErrorMessage,
  FormControl,
  Table,
  Thead,
  Tbody,
  Tr, Th, Td,
  Input,
  Box,
  Flex,
  Button,
} from '@chakra-ui/react'
import {CheckIcon} from "@chakra-ui/icons";
import {useTable} from 'react-table';
import {FlexCardWrapper} from "./CardWrapper";
import ZkSQL from "zk-sql/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "zk-sql/types/typechain";
import {Contract, ethers} from "ethers";
import {useRouter} from "next/router";
import {SqlQueryResult} from "zk-sql/client/client";
import {verifyProof} from "../../utils/verify";

interface TableViewProps {
}

export const TableView: FC<TableViewProps> = () => {
  const router = useRouter()
  const [tableName, setTableName] = useState("")
  const [columns, setColumns] = useState([]);
  const [values, setValues] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proof, setProof] = useState(null);
  const [reqMade, setReqMade] = useState(0);
  const [publicSignals, setPublicSignals] = useState([]);

  const {getTableProps, getTableBodyProps, headerGroups, rows, prepareRow} =
    useTable({columns, data: values});

  useEffect(() => {
    if (!router.isReady) return;
    const {name} = router.query;
    setTableName(name.toString());
    makeQuery({
      sql: `SELECT * FROM ${name.toString()}`
    });
  }, [router.isReady]);

  const {
    handleSubmit,
    register,
    formState: {errors, isSubmitting},
  } = useForm()

  async function makeQuery(values: { sql: string }) {
    fetch('/api/table/prepare', {
      method: 'POST',
      body: JSON.stringify({
        sql: values.sql
      })
    }).then((res) => res.json())
      .then(({commitExpected, table, commit}) => {
        if (commitExpected) {
          const contract = new Contract(process.env.NEXT_PUBLIC_ZK_SQL_CONTRACT!, ZkSQL.abi);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contractOwner = contract.connect(provider.getSigner()) as IZkSQL;
          return contractOwner.request(table, BigInt(commit)).then(() => values.sql);
        }
        return values.sql;
      }).then((sql) => {
      setLoading(true);
      fetch('/api/table/request', {
        method: 'POST',
        body: JSON.stringify({
          sql
        })
      }).then((res) => res.json())
        .then(({token, error}) => {
          if (error != null) {
            setError(error);
            setLoading(false);
            return;
          }
          poll(sql, token)
        });
    });
  }

  async function poll(sql: string, token: string) {
    let res: SqlQueryResult = await fetch('/api/table/query', {
      method: 'POST',
      body: JSON.stringify({
        token,
        sql
      })
    }).then((res) => res.json());

    if (!res.ready) {
      if (reqMade > 20) {
        setLoading(false);
        setError("request timed out");
      }
      setReqMade(reqMade + 1);
      return new Promise(resolve => setTimeout(resolve, 2000)).then(() => poll(sql, token));
    }

    if (res.error != null) {
      setLoading(false);
      setError(res.error);
      return;
    }

    if (res.selected != null) {
      setColumns(res.selected.columns);
      setValues(res.selected.values);
    }

    const isVerified = await verifyProof("select", res.publicSignals, res.proof);

    if (!isVerified) {
      setLoading(false);
      setError("proof verification failed!");
    }

    setProof(res.proof);
    setPublicSignals(res.publicSignals);
    setLoading(false);
  }

  function exportProof() {
    const files: [any, string][] = [[proof, "proof.json"], [publicSignals, "publicSignals.json"]];
    for (const [data, fileName] of files) {
      const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
        JSON.stringify(data)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = fileName;
      link.click();
    }
  }

  if (isLoading) return <p>Loading...</p>
  if (error != null) return <p>Error: {error}</p>

  return (
    <Box>
      <FlexCardWrapper mb={4}>
        <Table {...getTableProps()}>
          <Thead>
            {headerGroups.map((headerGroup, key) => (
              <Tr {...headerGroup.getHeaderGroupProps()} key={key}>
                {headerGroup.headers.map((column, key) => (
                  <Th {...column.getHeaderProps(column.getHeaderProps())} key={key}>
                    {column.render('Header')}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {rows.map((row, key) => {
              prepareRow(row)
              return (
                <Tr {...row.getRowProps()} key={key}>
                  {row.cells.map((cell, key) => (
                    <Td {...cell.getCellProps()} key={key}>
                      {cell.render('Cell')}
                    </Td>
                  ))}
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        <Box h='20px'/>
        {proof != null
          ? (<Button leftIcon={<CheckIcon/>} colorScheme='green' onClick={exportProof}>Download proof</Button>)
          : null
        }
      </FlexCardWrapper>
      <Box h='10px'/>
      <form onSubmit={handleSubmit(makeQuery)}>
        <Flex>
          <FormControl>
            <Input variant='filled' backgroundColor='dappTemplate.dark.darker' h='45px'
              id='sql'
              placeholder={`SELECT *
                              FROM ${tableName}`}
              {...register('sql', {
                required: 'This is required',
              })}
            />
            <FormErrorMessage>
              {errors.name && errors.name.message}
            </FormErrorMessage>
          </FormControl>
          <Box w='20px' h='45px'/>
          <Button colorScheme='teal' isLoading={isSubmitting} type='submit'>
            Submit
          </Button>
        </Flex>
      </form>
    </Box>

  )
}
